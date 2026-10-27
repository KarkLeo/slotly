create function private.expire_holds()
returns void
language plpgsql
set search_path = ''
as $$
declare
  expired record;
begin
  for expired in
    update public.appointments a
    set status = 'cancelled', hold_until = null, cancelled_by = 'system'
    where a.status = 'pending' and a.hold_until <= now()
    returning a.id, a.contact_confirmed_at
  loop
    if expired.contact_confirmed_at is null then
      update public.appointment_clients ac set client_ip = null where ac.appointment_id = expired.id;
    else
      perform private.enqueue_notification('master_did_not_respond', expired.id);
    end if;
  end loop;
end;
$$;

create function private.complete_appointments()
returns void
language sql
set search_path = ''
as $$
  update public.appointments a
  set status = 'completed'
  -- Completing frees the busy time, so the buffer after the appointment runs out first.
  where a.status = 'confirmed' and upper(a.during) + make_interval(mins => a.buffer_minutes) <= now();
$$;

create function private.enqueue_reminders()
returns void
language plpgsql
set search_path = ''
as $$
declare
  due uuid;
begin
  for due in
    select a.id
    from public.appointments a
    join public.appointment_clients ac on ac.appointment_id = a.id
    join public.client_cards cc on cc.id = ac.client_card_id
    where a.status = 'confirmed'
      and lower(a.during) > now()
      and lower(a.during) <= now() + interval '24 hours'
      and cc.user_id is not null
      -- A client who booked within a day of the start remembers it.
      and a.created_at <= lower(a.during) - interval '24 hours'
      -- Any notice within the last day before the start, an earlier reminder included, reminds the client already.
      and not exists (
        select 1 from private.notifications n
        where n.appointment_id = a.id
          and private.notification_audience(n.kind) = 'client'
          and n.created_at > lower(a.during) - interval '24 hours'
      )
  loop
    perform private.enqueue_notification('reminder', due);
  end loop;
end;
$$;

create function private.clean_up()
returns void
language sql
set search_path = ''
as $$
  delete from private.notifications n
  where n.status <> 'pending' and n.created_at < now() - interval '30 days';

  delete from private.rate_limits r
  where r.window_start < now() - interval '1 day';

  -- A hold whose contact was never confirmed is not a booking, and its email was typed by anyone.
  delete from public.appointments a
  where a.status = 'cancelled'
    and a.source = 'client'
    and a.created_at < now() - interval '1 day'
    and exists (
      select 1 from public.appointment_clients ac
      where ac.appointment_id = a.id and ac.unconfirmed_email is not null
    );

  -- Asking for a code creates the user; one who never entered it is left behind.
  delete from auth.users u
  where u.email_confirmed_at is null
    and u.phone_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at < now() - interval '1 day'
    -- A code asked for again keeps the user until it runs out.
    and coalesce(u.confirmation_sent_at, u.created_at) < now() - interval '1 day'
    -- Deleting a master's user would cascade to the whole cabinet.
    and not exists (select 1 from public.masters m where m.id = u.id);

  delete from cron.job_run_details d
  where d.end_time < now() - interval '7 days';
$$;

revoke execute on function
  private.expire_holds(),
  private.complete_appointments(),
  private.enqueue_reminders(),
  private.clean_up()
from public;

select cron.schedule('expire-holds', '* * * * *', 'select private.expire_holds()');
select cron.schedule('complete-appointments', '* * * * *', 'select private.complete_appointments()');
select cron.schedule('enqueue-reminders', '*/15 * * * *', 'select private.enqueue_reminders()');
select cron.schedule('clean-up', '0 3 * * *', 'select private.clean_up()');

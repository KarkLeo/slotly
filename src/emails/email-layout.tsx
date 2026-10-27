import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import type { Locale } from "@/i18n/locales";
import { styles } from "./styles";

export type EmailLayoutProps = {
  locale: Locale;
  preview: string | null;
  title: string;
  intro: string;
  details: { label: string; value: string }[];
  comment: { label: string; text: string } | null;
  // The first action is the button, the rest are plain links under it.
  actions: { label: string; url: string }[];
  code: string | null;
  note: string | null;
};

export function EmailLayout({
  locale,
  preview,
  title,
  intro,
  details,
  comment,
  actions,
  code,
  note,
}: EmailLayoutProps) {
  const [button, ...links] = actions;
  return (
    <Html lang={locale}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {preview && <Preview>{preview}</Preview>}
      <Body lang={locale} style={styles.body}>
        <Container style={styles.card}>
          <Text style={styles.brand}>Slotly</Text>
          <Heading as="h1" style={styles.title}>
            {title}
          </Heading>
          <Text style={styles.text}>{intro}</Text>
          {details.length > 0 && (
            <Section style={styles.details}>
              {details.map((row) => (
                <div key={row.label}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.value}>{row.value}</Text>
                </div>
              ))}
            </Section>
          )}
          {comment && (
            <Section style={styles.comment}>
              <Text style={styles.label}>{comment.label}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </Section>
          )}
          {button && (
            <Button href={button.url} style={styles.button}>
              {button.label}
            </Button>
          )}
          {links.map((link) => (
            <Text key={link.url} style={styles.secondaryAction}>
              <Link href={link.url} style={styles.link}>
                {link.label}
              </Link>
            </Text>
          ))}
          {code && <Text style={styles.code}>{code}</Text>}
          {note && <Text style={styles.note}>{note}</Text>}
        </Container>
      </Body>
    </Html>
  );
}

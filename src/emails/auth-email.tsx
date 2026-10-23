import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";
import type { Locale } from "@/i18n/locales";
import { styles } from "./styles";

export type AuthEmailProps = {
  locale: Locale;
  preview: string | null;
  title: string;
  intro: string;
  details: { label: string; value: string }[];
  button: string;
  link: string;
  code: string | null;
  note: string;
};

export function AuthEmailLayout({
  locale,
  preview,
  title,
  intro,
  details,
  button,
  link,
  code,
  note,
}: AuthEmailProps) {
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
          <Button href={link} style={styles.button}>
            {button}
          </Button>
          {code && <Text style={styles.code}>{code}</Text>}
          <Text style={styles.note}>{note}</Text>
        </Container>
      </Body>
    </Html>
  );
}

import { ResetFlow } from "@/components/auth/mail-flows";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Сброс пароля: письмо со ссылкой, по ссылке — новый пароль. Без почты на сервере — честно недоступно. */
export default async function ResetPage(props: PageProps<"/reset">) {
  const params = await props.searchParams;
  return <ResetFlow uid={one(params.uid)} token={one(params.token)} />;
}

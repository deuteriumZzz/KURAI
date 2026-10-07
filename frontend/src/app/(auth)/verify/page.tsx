import { VerifyFlow } from "@/components/auth/mail-flows";

/** Подтверждение адреса по ссылке из письма регистрации. */
export default async function VerifyPage(props: PageProps<"/verify">) {
  const { token } = await props.searchParams;
  return <VerifyFlow token={Array.isArray(token) ? token[0] : token} />;
}

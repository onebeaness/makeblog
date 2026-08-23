/** 서버와 클라이언트가 같은 문자열을 만들도록 타임존을 고정한다. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  })
    .format(new Date(iso))
    .replace(/\.$/, "")
    .replaceAll(". ", "-")
    .replace(".", "-");
}

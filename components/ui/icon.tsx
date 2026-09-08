export function Icon({
  name,
}: {
  name: "github" | "search" | "menu" | "fire" | "clock" | "flag";
}) {
  const paths = {
    github:
      "M9 19c-4 1-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 3-.3 6-1.5 6-6.5 0-1.5-.5-2.5-1.5-3.5.2-.5.6-2-.2-3.5 0 0-1.2-.4-3.8 1a13 13 0 0 0-7 0C4.4 1.6 3.2 2 3.2 2c-.8 1.5-.4 3-.2 3.5C2 6.5 1.5 7.5 1.5 9c0 5 3 6.2 6 6.5-.5.5-.5 1-.5 2V21",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    menu: "M3 5h18M3 12h18M3 19h18",
    fire: "M12 2c2 6-4 7-3 11 2 0 4-2 5-4 8 7 4 13-2 13C4 22 1 15 7 8c-1 4 1 5 1 5-1-5 3-6 4-11Z",
    clock: "M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    flag: "M4 22V3m0 0c5-5 10 5 16 0v11c-6 5-11-5-16 0",
  };
  return (
    <svg
      className={"icon icon-" + name}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

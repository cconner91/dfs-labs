import { ImageResponse } from "next/og";

/** Simple monogram icon used for PWA icons and the favicon — swap for real brand art later. */
export function generateAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontSize: size * 0.42,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: -2,
        }}
      >
        DL
      </div>
    ),
    { width: size, height: size }
  );
}

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("allows external html attributes without hydration warnings", () => {
    const layout = RootLayout({
      children: <div>content</div>,
    });

    expect(layout.props.suppressHydrationWarning).toBe(true);
  });
});

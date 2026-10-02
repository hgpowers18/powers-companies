/* The stock preview only follows the editor when that pane is scrolled, and it
   parks on the first division. Editing the second section then changes a
   heading that is below the fold, so the preview looks frozen. This template
   keeps both headings on screen and redraws them from the draft as you type. */
const SitePreview = createClass({
  render: function () {
    const entry = this.props.entry;
    const data = entry.get("data");
    const plain = (value) => (value && typeof value.toJS === "function" ? value.toJS() : value);
    const divisions = plain(data && data.get("divisions")) || [];
    const messages = plain(data && data.getIn(["banner", "messages"])) || [];

    const banner = messages
      .map((message) =>
        (message.parts || [])
          .map((part) => ((part && part.text) || "").trim())
          .filter(Boolean)
          .join(" "),
      )
      .filter(Boolean);

    return h(
      "div",
      {
        style: {
          fontFamily: '"Hanken Grotesk", sans-serif',
          color: "#1c1a17",
          background: "#f3efe6",
          padding: "20px 24px 40px",
        },
      },
      banner.length
        ? h(
            "div",
            {
              "data-key-path": "banner",
              style: {
                background: "#c19a4f",
                color: "#1c1a17",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.04em",
                padding: "12px 16px",
                marginBottom: "22px",
              },
            },
            banner.map((line, index) =>
              h(
                "div",
                { key: index, "data-key-path": "banner.messages." + index },
                line,
              ),
            ),
          )
        : null,
      h(
        "div",
        { style: { display: "grid", gap: "18px" } },
        divisions.map((division, index) =>
          h(
            "section",
            {
              key: division.id || index,
              "data-key-path": "divisions." + index,
              style: {
                background: "#fff",
                border: "1px solid #e0d8c7",
                padding: "16px 18px",
              },
            },
            h(
              "div",
              {
                "data-key-path": "divisions." + index + ".label",
                tabIndex: 0,
                style: {
                  color: "#c19a4f",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                },
              },
              division.label || "",
            ),
            h(
              "h2",
              {
                "data-key-path": "divisions." + index + ".title",
                tabIndex: 0,
                style: {
                  fontFamily: '"DM Sans", sans-serif',
                  fontWeight: 400,
                  fontSize: "28px",
                  lineHeight: 1.15,
                  margin: 0,
                },
              },
              division.title || "",
            ),
          ),
        ),
      ),
    );
  },
});

CMS.registerPreviewTemplate("site", SitePreview);

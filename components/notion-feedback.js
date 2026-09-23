// Version: v0.1.0.0.0
// Shared [Feedback]/[Response] tag detection for any page rendering Notion blocks.
(function (global) {
  function getBlockPlainText(block) {
    if (!block || !block.type) return null;
    const data = block[block.type];
    if (!data || !Array.isArray(data.rich_text)) return null;
    return data.rich_text.map(rt => rt.plain_text).join("");
  }

  function extractTag(text, tag) {
    if (typeof text !== "string") return null;
    const trimmed = text.trimStart();
    const prefix = `[${tag}]`;
    if (trimmed.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
    return trimmed.slice(prefix.length).trimStart();
  }

  function createFeedbackElement(feedbackText, responseText, el) {
    const wrap = el("div", "feedback-block");

    const feedbackLabel = el("div", "feedback-label");
    feedbackLabel.textContent = "Feedback";
    wrap.appendChild(feedbackLabel);

    const feedbackBody = el("p", "feedback-text");
    feedbackBody.textContent = feedbackText;
    wrap.appendChild(feedbackBody);

    if (responseText) {
      const responseLabel = el("div", "response-label");
      responseLabel.textContent = "Response";
      wrap.appendChild(responseLabel);

      const responseBody = el("p", "response-text");
      responseBody.textContent = responseText;
      wrap.appendChild(responseBody);
    }

    return wrap;
  }

  // Renders a list of sibling blocks, grouping a [Feedback] block with an
  // immediately following [Response] block into a single feedback element.
  // options: { shouldSkip(block), renderSingleBlock(block, parentEl), el(tag, cls) }
  function renderBlockSequence(blockList, parentEl, options) {
    const { shouldSkip, renderSingleBlock, el } = options;
    const items = blockList || [];

    for (let i = 0; i < items.length; i++) {
      const block = items[i];
      if (shouldSkip(block)) continue;

      const feedbackText = extractTag(getBlockPlainText(block), "Feedback");
      if (feedbackText !== null) {
        const nextBlock = items[i + 1];
        let responseText = null;

        if (nextBlock && !shouldSkip(nextBlock)) {
          const candidate = extractTag(getBlockPlainText(nextBlock), "Response");
          if (candidate !== null) {
            responseText = candidate;
            i++;
          }
        }

        parentEl.appendChild(createFeedbackElement(feedbackText, responseText, el));
        continue;
      }

      renderSingleBlock(block, parentEl);
    }
  }

  global.NotionFeedback = { getBlockPlainText, extractTag, renderBlockSequence };
})(window);

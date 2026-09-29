// Version: v0.2.0.0.0
// Shared [Feedback]/[Response], [Technical Note], and [Video Label] tag detection
// for any page rendering Notion blocks.
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

  function createTechnicalNoteElement(noteText, el) {
    const wrap = el("div", "technical-note-block");

    const label = el("div", "technical-note-label");
    label.textContent = "Technical Note";
    wrap.appendChild(label);

    const body = el("p", "technical-note-text");
    body.textContent = noteText;
    wrap.appendChild(body);

    return wrap;
  }

  function createVideoLabelElement(labelText, el) {
    const wrap = el("div", "video-label-block");

    const body = el("span", "video-label-text");
    body.textContent = labelText;
    wrap.appendChild(body);

    return wrap;
  }

  function isVideoBlock(block) {
    return !!block && block.type === "video";
  }

  // Renders a list of sibling blocks, applying tag-based special rendering:
  // [Feedback] pairs with a following [Response]; [Technical Note] becomes a callout;
  // [Video Label] captions the adjacent video block.
  // options: { shouldSkip(block), renderSingleBlock(block, parentEl), el(tag, cls) }
  function renderBlockSequence(blockList, parentEl, options) {
    const { shouldSkip, renderSingleBlock, el } = options;
    const items = blockList || [];

    for (let i = 0; i < items.length; i++) {
      const block = items[i];
      if (shouldSkip(block)) continue;

      const blockText = getBlockPlainText(block);

      const feedbackText = extractTag(blockText, "Feedback");
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

      const technicalNoteText = extractTag(blockText, "Technical Note");
      if (technicalNoteText !== null) {
        parentEl.appendChild(createTechnicalNoteElement(technicalNoteText, el));
        continue;
      }

      const videoLabelText = extractTag(blockText, "Video Label");
      if (videoLabelText !== null) {
        const group = el("div", "video-label-group");
        group.appendChild(createVideoLabelElement(videoLabelText, el));

        // Pull the next video/embed block inside the group so the label reads as its caption.
        let lookahead = i + 1;
        while (lookahead < items.length && shouldSkip(items[lookahead])) lookahead++;

        if (lookahead < items.length && isVideoBlock(items[lookahead])) {
          renderSingleBlock(items[lookahead], group);
          i = lookahead;
        }

        parentEl.appendChild(group);
        continue;
      }

      renderSingleBlock(block, parentEl);
    }
  }

  global.NotionFeedback = { getBlockPlainText, extractTag, renderBlockSequence };
})(window);

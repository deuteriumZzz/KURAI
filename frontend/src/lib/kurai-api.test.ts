import { describe, expect, it, vi } from "vitest";
import { createKuraiClient } from "./kurai-api";

describe("KURAI API client", () => {
  it("creates a project through the server contract and maps it to the UI shape", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "b4d0", name: "Запуск", accent: "cyan", createdAt: "2026-09-24T10:00:00Z" } }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const project = await api.createProject("Запуск");

    expect(project).toEqual({ id: "b4d0", name: "Запуск", chatIds: [], createdAt: "2026-09-24T10:00:00Z", instructions: "", defaultModel: "" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.kurai.test/api/v1/projects",
      expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify({ name: "Запуск", accent: "cyan" }) }),
    );
  });

  it("preserves a readable API error instead of silently falling back", async () => {
    const api = createKuraiClient("https://api.kurai.test", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "authentication_required", message: "Войдите." } }), { status: 401 }),
    ));

    await expect(api.createProject("Запуск")).rejects.toMatchObject({ code: "authentication_required", status: 401 });
  });

  it("gets a CSRF token before creating an authenticated session", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "u1", email: "dmitry@example.test", displayName: "Дмитрий", csrfToken: "csrf-2" } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const member = await api.signUp({ email: "dmitry@example.test", password: "safe-password-2026", displayName: "Дмитрий" });

    expect(member.email).toBe("dmitry@example.test");
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.kurai.test/api/v1/auth/sign-up", expect.objectContaining({ headers: expect.objectContaining({ "X-CSRFToken": "csrf-1" }) }));
  });

  it("binds the selected OpenRouter model to both quote and run", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { quoteId: "q1", mode: "text", resolvedModel: "openai/gpt-5", estimatedCostMicro: 5000, expiresInSeconds: 60 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { runId: "r1", chatId: "c1", status: "queued", estimatedCostMicro: 5000, eventUrl: "/events" } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const quote = await api.quote("text", "Собери план", "openai/gpt-5");
    await api.startRun({ chatId: "c1", quoteId: quote.quoteId, mode: "text", modelId: "openai/gpt-5", text: "Собери план", idempotencyKey: "idempotent-1" });

    expect(fetcher).toHaveBeenNthCalledWith(2, "https://api.kurai.test/api/v1/runs/quote", expect.objectContaining({ body: JSON.stringify({ mode: "text", modelId: "openai/gpt-5", text: "Собери план", attachmentIds: [], options: {} }) }));
    expect(fetcher).toHaveBeenNthCalledWith(3, "https://api.kurai.test/api/v1/runs", expect.objectContaining({ body: JSON.stringify({ chatId: "c1", quoteId: "q1", mode: "text", modelId: "openai/gpt-5", text: "Собери план", attachmentIds: [], options: {} }) }));
  });

  it("sends an optional parent message when creating a branch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { runId: "r1", chatId: "c1", status: "queued", estimatedCostMicro: 5000, eventUrl: "/events" } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await api.startRun({ chatId: "c1", parentId: "m-parent", quoteId: "q1", mode: "text", modelId: "openai/gpt-5", text: "Сделай короче", idempotencyKey: "branch-key" });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/runs",
      expect.objectContaining({ body: JSON.stringify({ chatId: "c1", parentId: "m-parent", quoteId: "q1", mode: "text", modelId: "openai/gpt-5", text: "Сделай короче", attachmentIds: [], options: {} }) }),
    );
  });

  it("starts an explicit bounded comparison with one shared prompt and preflight quotes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { compareId: "cmp-1", inputMessageId: "m-user", estimatedTotalCostMicro: 14000, runs: [] } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await api.startCompareRun({
      chatId: "c1",
      mode: "text",
      text: "Собери план",
      routes: [
        { modelId: "openai/gpt-5", quoteId: "q1" },
        { modelId: "anthropic/claude-opus", quoteId: "q2" },
      ],
      idempotencyKey: "compare-key-1",
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/runs/compare",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "compare-key-1", "X-CSRFToken": "csrf-1" }),
        body: JSON.stringify({
          chatId: "c1",
          mode: "text",
          text: "Собери план",
          attachmentIds: [],
          options: {},
          routes: [
            { modelId: "openai/gpt-5", quoteId: "q1" },
            { modelId: "anthropic/claude-opus", quoteId: "q2" },
          ],
        }),
      }),
    );
  });

  it("saves an answer as a server-owned artifact rather than sending an arbitrary body", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "a1", title: "Research", body: "Saved", provenance: {}, kind: "document" } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await api.saveArtifact({ messageId: "message-1", kind: "research_packet", title: "Research" });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/artifacts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ messageId: "message-1", kind: "research_packet", title: "Research" }),
      }),
    );
  });

  it("saves a reusable route from an owned completed answer", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "recipe-1", title: "Launch", prompt: "Write a plan", mode: "text", model: "openai/gpt-5", sourceCostMicro: 7000 } }), { status: 201 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await api.saveRecipe({ messageId: "message-1", title: "Launch" });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/recipes",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ messageId: "message-1", title: "Launch" }) }),
    );
  });

  it("creates an expiring private share link and reads its public snapshot by token", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "share-1", token: "opaque-token", chatId: "c1", expiresAt: "2026-10-01T00:00:00Z", createdAt: "2026-09-30T00:00:00Z" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { chat: { title: "Launch" }, messages: [] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "share-1", token: "opaque-token", chatId: "c1", expiresAt: "2026-10-01T00:00:00Z", createdAt: "2026-09-30T00:00:00Z" }] }), { status: 200 }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const link = await api.createShareLink("c1", 24);
    const shared = await api.getSharedChat(link.token);
    const links = await api.shareLinks("c1");

    expect(link).toMatchObject({ token: "opaque-token", expiresAt: "2026-10-01T00:00:00Z" });
    expect(shared.chat.title).toBe("Launch");
    expect(links).toHaveLength(1);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/chats/c1/share-links",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ expiresInHours: 24 }) }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(3, "https://api.kurai.test/api/v1/shares/opaque-token", expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(fetcher).toHaveBeenNthCalledWith(4, "https://api.kurai.test/api/v1/chats/c1/share-links", expect.objectContaining({ method: "GET", credentials: "include" }));
  });

  it("resolves a relative durable-event URL against the configured API origin", () => {
    const api = createKuraiClient("https://api.kurai.test", vi.fn());

    expect(api.runEventUrl({ runId: "r1", chatId: "c1", outputMessageId: "m1", status: "queued", estimatedCostMicro: 5000, eventUrl: "/api/v1/runs/r1/events" }))
      .toBe("https://api.kurai.test/api/v1/runs/r1/events");
  });

  it("reads only server-declared live capabilities", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { modes: [{ id: "text", available: true, modelCount: 4 }, { id: "video", available: false, modelCount: 0 }] } }), { status: 200 }),
    );
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await expect(api.capabilities()).resolves.toEqual({ modes: [{ id: "text", available: true, modelCount: 4 }, { id: "video", available: false, modelCount: 0 }] });
    expect(fetcher).toHaveBeenCalledWith("https://api.kurai.test/api/v1/capabilities", expect.objectContaining({ method: "GET", credentials: "include" }));
  });

  it("exports a selected answer as a private presentation attachment", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "csrf-1" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response("pptx-bytes", { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" } }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const file = await api.exportSlides("message-1", "Q4 plan");

    expect(file.type).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.kurai.test/api/v1/messages/message-1/exports/slides",
      expect.objectContaining({ method: "POST", credentials: "include", headers: expect.objectContaining({ "X-CSRFToken": "csrf-1" }), body: JSON.stringify({ title: "Q4 plan" }) }),
    );
  });

  it("downloads a private account archive without creating a public link", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("zip-bytes", { status: 200, headers: { "Content-Type": "application/zip" } }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    const archive = await api.exportAccountData();

    expect(archive.type).toBe("application/zip");
    expect(fetcher).toHaveBeenCalledWith("https://api.kurai.test/api/v1/me/export", expect.objectContaining({ method: "GET", credentials: "include" }));
  });
});

describe("KURAI API client — run options and chat actions", () => {
  const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });

  it("binds run options to the quote and archives a chat with PATCH", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok({ csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(ok({ quoteId: "q1", mode: "image", resolvedModel: "m", estimatedCostMicro: 1, expiresInSeconds: 60 }))
      .mockResolvedValueOnce(ok({ id: "c1" }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await api.quote("image", "город", "acme/image", [], { count: 4 });
    await api.updateChat("c1", { archived: true });

    expect(JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string)).toMatchObject({ mode: "image", options: { count: 4 } });
    expect(fetcher.mock.calls[2]?.[0]).toBe("https://api.kurai.test/api/v1/chats/c1");
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ archived: true }) });
  });

  it("estimates a price from the draft length only — the draft text never leaves the browser", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(ok({ csrfToken: "csrf-1" })).mockResolvedValueOnce(ok({ estimatedCostMicro: 33_000, parts: { input: 1_000, output: 32_000 } }));
    const api = createKuraiClient("https://api.kurai.test", fetcher);

    await expect(api.estimate("text", "openrouter/auto", 500, { web: true, think: false })).resolves.toEqual({ estimatedCostMicro: 33_000, parts: { input: 1_000, output: 32_000 } });

    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.kurai.test/api/v1/runs/estimate");
    expect(JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string)).toEqual({ mode: "text", modelId: "openrouter/auto", chars: 500, options: { web: true, think: false } });
  });
});

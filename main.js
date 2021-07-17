const routes = {
  "/": () => {
    // Fetch the index.html file relative to the main.js file
    const upstream = fetch(new URL("index.html", import.meta.url));
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    return new Response(upstream.body, { ...upstream, headers });
  },
  "/send": (event) => {
    const { searchParams } = new URL(event.request.url);
    const message = searchParams.get("message");
    
    if (!message) {
      return new Response("?message not provided", { status: 400 });
    }

    // Post a message to the broadcast channel
    const channel = new BroadcastChannel("chat");
    channel.postMessage(message);
    return new Response("Success");
  },
  "/messages": (event) => {
    // Create a message bus to pass chat messages
    const channel = new BroadcastChannel("chat");
    const stream = new ReadableStream({
      start(controller) {
        channel.onmessage = (e) => {
          console.log("Messages stream got ", e.data);
          const body = `data: ${JSON.stringify(e.data)}\n\n`;
          controller.enqueue(body);
        };
      },
      cancel() {
        console.log("disconnecting from channel");
        channel.close();
      },
    });

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: { "content-type": "text/event-stream" },
    });
  },
};

addEventListener("fetch", (event) => {
  const { pathname } = new URL(event.request.url);
  const route = routes[pathname || "/"];
  if (route) {
    return event.respondWith(route(event));
  } else {
    return event.respondWith(new Response("not found", { status: 404 }));
  }
});

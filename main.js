const routes = {
  '/': () => new Response(`
<!DOCTYPE html>
<html lang="en">
<div id="messages"></div>
<form id="chatbox"><input id="message" /></form>

<script>
  var messages = document.getElementById('messages')
  var form = document.getElementById('chatbox')
  var message = document.getElementById('message')

  // Subscribe and respond to events
  var events = new EventSource("/messages");
  events.addEventListener("open", () => {
    console.log('connected')
  })
  events.addEventListener("error", () => {
    console.log("ready state", events.readyState)
  })
  events.addEventListener("message", (e) => {
    console.log('got message', e.data)
    console.log(e.data);
    const p = document.createElement('p')
    p.appendChild(document.createTextNode(JSON.parse(e.data)))
    messages.appendChild(p)
  })

  form.addEventListener('submit', (event) => {
    event.stopPropagation()
    event.preventDefault()
    fetch('/send?message=' + message.value)
    message.value = ''
  })
</script>

</html>
  `),
  '/send': (event) => {
    const { searchParams } = new URL(event.request.url)
    const message = searchParams.get('message')
    if (!message) {
      return new Response('?message not provided', { status: 400 })
    }

    // Post a message to the broadcast channel
    const channel = new BroadcastChannel('chat')
    channel.postMessage(message)
    return new Response('Success')
  },
  '/messages': (event) => {
    // Create a message bus to pass chat messages
    const channel = new BroadcastChannel('chat')
    const stream = new ReadableStream({
      start (controller) {
        channel.onmessage = (e) => {
          console.log('Messages stream got ', e.data)
          const body = `data: ${JSON.stringify(e.data)}\n\n`
          controller.enqueue(body)
        }
      },
      cancel () {
        console.log('disconnecting from channel')
        channel.close()
      }
    })

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: { 'content-type': 'text/event-stream' }
    })
  }
}

addEventListener('fetch', (event) => {
  const { pathname } = new URL(event.request.url)
  const route = routes[pathname || '/']
  if (route) {
    return event.respondWith(route(event))
  } else {
    return event.respondWith(new Response('not found', { status: 404 }))
  }
})

# XenoPi

XenoPi is a small distribution of [pi](https://github.com/earendil-works/pi) that uses
[Xenolith](https://github.com/simoneiacomino/xenolith) for local inference.
I made it to try the protocol with a real coding agent.

## Quick start

On Linux x86_64:

```sh
curl -fsSL https://xenolith.it/install.sh | sh -s -- --interface xenopi
```

The installer sets up XenoPi and Xenolith, guides you through model configuration
or reuses your existing setup, and starts XenoPi. It includes the Node runtime.

For later sessions, run this from your project directory:

```sh
xenopi
```

## Build from source

You need **Node.js 26+**, npm, and a [built Xenolith engine](https://github.com/simoneiacomino/xenolith#build-from-source)
with a supported model. From a source checkout:

```sh
git clone https://github.com/simoneiacomino/xenopi.git
cd xenopi
npm ci --ignore-scripts
npm run build
npm_config_prefix="$HOME/.local" npm link --ignore-scripts
xenolith config init --model /absolute/path/to/model.gguf
xenopi
```

Skip `config init` if Xenolith is already configured. The engine must be on
`PATH`, or selected with `XENOLITH_BIN=/absolute/path/to/xenolith`.
The linked command uses this checkout; rebuild after source changes.
For an installation independent of the checkout, see [build and install](docs/build.md).

## Using XenoPi

XenoPi keeps Pi's coding tools, interactive terminal UI and MCP support.
It discovers the engine's model and capabilities, then keeps a native session
across turns, checkpoints and rewinds. Xenolith starts when needed and shares
its model configuration with other clients.

With a vision model and projector configured in Xenolith, attach a local image:

```sh
xenopi @/path/to/image.jpg "Describe this image"
```

PNG/JPEG attachments support one image per message or tool result.
Use `xenopi mcp --help` to manage MCP servers, or `/mcp` within a session.

- [Engine configuration and sessions](docs/configuration.md)
- [Images and vision settings](docs/vision.md)
- [MCP and Codemode](docs/mcp.md)
- [Linux packages and releases](docs/releases.md)
- [Development, validation and compatibility](docs/development.md) · [Contributing](CONTRIBUTING.md)

XenoPi is licensed under [MIT](LICENSE.md). Project website: [xenolith.it](https://xenolith.it).

## Reasoning prefix: `/lobotomy`

With an engine advertising `reasoning.prefix`, use `/lobotomy your text` to set
an initial reasoning passage for the current conversation. `/lobotomy` displays
it and `/lobotomy off` disables future insertions. Enable thinking before sending
a message. A status indicator shows when the setting is active.

The setting is saved in the Pi session and restored on reopening or changing
sessions. It is sent only for new user turns, never for tool continuations or
one-off summaries. The supplied text appears at the beginning of the thinking
block; its provenance is retained in the saved thinking signature and when
rebuilding wire history. Turning it off does not undo previous conversation
content. Text is limited to the engine's advertised UTF-8 byte limit; model
framing tokens and NUL are refused. Engines without this capability still support
ordinary conversations but refuse `/lobotomy` activation.

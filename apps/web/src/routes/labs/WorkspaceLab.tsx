export type WorkspaceLabProps = {
  projectName: string;
  agentHost: string;
  route: string;
};

export function WorkspaceLab({ projectName, agentHost, route }: WorkspaceLabProps) {
  const runtime = typeof window === "undefined"
    ? { href: "server", origin: "server", pathname: "server", hash: route }
    : {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        hash: window.location.hash
      };

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>工作区实验室</h2>
      <p style={copyStyle}>
        这里展示当前 Web 客户端和浏览器上下文对应的轻量工作区元数据。
      </p>
      <pre style={preStyle}>
        {JSON.stringify(
          {
            projectName,
            agentHost,
            route,
            runtime
          },
          null,
          2
        )}
      </pre>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const preStyle = { margin: 0, background: "#f6f8fa", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="w-full max-w-lg">
      <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-3">
        Response
      </h3>
      <pre className="bg-white border border-zinc-200 rounded-lg p-4 overflow-auto max-h-80 text-xs font-mono leading-relaxed shadow-sm">
        <code>
          {json.split("\n").map((line, i) => (
            <div key={i}>
              {line.split(/(".*?")/g).map((part, j) => {
                if (part.startsWith('"') && part.endsWith('"')) {
                  return (
                    <span key={j} className="text-emerald-600">
                      {part}
                    </span>
                  );
                }
                if (/^-?\d+\.?\d*$/.test(part)) {
                  return (
                    <span key={j} className="text-violet-600">
                      {part}
                    </span>
                  );
                }
                return <span key={j}>{part}</span>;
              })}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

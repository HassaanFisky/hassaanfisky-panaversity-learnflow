"use client";

import Editor, { OnChange } from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}

export default function MonacoEditor({ 
  value, 
  onChange, 
  language = "python", 
  theme = "vs-dark",
  readOnly = false 
}: MonacoEditorProps) {
  
  const handleEditorChange: OnChange = (value) => {
    onChange(value || "");
  };

  return (
    <div className="w-full h-full min-h-[400px] border shadow-2xl rounded-2xl overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={value}
        value={value}
        onChange={handleEditorChange}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          fontWeight: "600",
          fontFamily: "'Fira Code', 'Courier New', monospace",
          lineNumbers: "on",
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly: readOnly,
          automaticLayout: true,
          padding: { top: 20, bottom: 20 },
          cursorBlinking: "phase",
          smoothScrolling: true,
          scrollbar: {
            vertical: "hidden",
            horizontal: "hidden"
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: "all",
          contextmenu: false,
        }}
      />
    </div>
  );
}

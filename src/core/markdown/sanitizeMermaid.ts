const FLOWCHART_HEADER = /^(flowchart|graph)\b/i;

function findMatchingBracket(line: string, openIndex: number): number {
  if (line[openIndex] !== "[") {
    return -1;
  }

  let depth = 0;
  for (let index = openIndex; index < line.length; index += 1) {
    if (line[index] === "[") {
      depth += 1;
    } else if (line[index] === "]") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function sanitizeFlowchartLine(line: string): string {
  let output = "";
  let index = 0;

  while (index < line.length) {
    const rest = line.slice(index);
    const nodeMatch = rest.match(/^([\w][\w-]*)\[/);
    if (!nodeMatch) {
      output += line[index];
      index += 1;
      continue;
    }

    const nodeId = nodeMatch[1];
    const bracketIndex = index + nodeMatch[0].length - 1;

    if (line[bracketIndex + 1] === '"') {
      const closeQuote = line.indexOf('"]', bracketIndex + 2);
      if (closeQuote === -1) {
        output += line[index];
        index += 1;
        continue;
      }
      output += line.slice(index, closeQuote + 2);
      index = closeQuote + 2;
      continue;
    }

    const closeIndex = findMatchingBracket(line, bracketIndex);
    if (closeIndex === -1) {
      output += line[index];
      index += 1;
      continue;
    }

    const label = line.slice(bracketIndex + 1, closeIndex);
    if (/[[\]]/.test(label)) {
      const escaped = label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      output += `${nodeId}["${escaped}"]`;
    } else {
      output += line.slice(index, closeIndex + 1);
    }
    index = closeIndex + 1;
  }

  return output;
}

export function sanitizeMermaidDefinition(definition: string): string {
  const trimmed = definition.trim();
  if (!FLOWCHART_HEADER.test(trimmed)) {
    return definition;
  }

  return definition
    .split("\n")
    .map((line) => sanitizeFlowchartLine(line))
    .join("\n");
}

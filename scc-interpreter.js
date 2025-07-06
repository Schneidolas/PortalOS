// scc-interpreter.js

// Para evitar poluir o escopo global, colocamos nosso interpretador em um objeto.
window.sccInterpreter = {
    async execute(scriptContent, api) {
        const lines = scriptContent.split('\n');
        const variables = new Map();
        let echoOn = true;

        const evaluateCondition = (condition) => {
            // Suporta apenas '==' por enquanto, mas pode ser expandido
            const parts = condition.split('==');
            if (parts.length !== 2) return false;

            const left = parts[0].trim();
            const right = parts[1].trim();

            const leftValue = variables.has(left) ? variables.get(left) : left;
            const rightValue = variables.has(right) ? variables.get(right) : right;

            return String(leftValue) == String(rightValue);
        };
        
        const findMatchingBrace = (startIndex) => {
            let braceCount = 1;
            for (let i = startIndex + 1; i < lines.length; i++) {
                if (lines[i].trim().startsWith('{')) braceCount++;
                if (lines[i].trim().startsWith('}')) braceCount--;
                if (braceCount === 0) return i;
            }
            return -1; // Não encontrou
        };

        for (let i = 0; i < lines.length; i++) {
            const originalLine = lines[i];
            let line = originalLine.trim();

            if (line === '') continue;

            if (line.toLowerCase() === '@echo off') {
                echoOn = false;
                continue;
            }

            if (echoOn) {
                api.printOutput(`${api.prompt}${originalLine}`);
            }

            // --- Execução dos Comandos SCC ---

            if (line.toLowerCase() === 'cls') {
                api.cls();
            } else if (line.toLowerCase().startsWith('print >>')) {
                api.printOutput(line.substring(9).trim());
            } else if (line.toLowerCase().startsWith('var ')) {
                const varName = line.substring(4).trim();
                variables.set(varName, null);
            } else if (line.toLowerCase().startsWith('imput >>')) {
                const varName = line.substring(9).trim();
                api.printOutput(line.substring(9).trim() + ": ");
                const userInput = await api.promptForInput('');
                variables.set(varName, userInput);
            } else if (line.toLowerCase() === '%continue%') {
                await api.waitForSpace();
            } else if (line.toLowerCase().startsWith('if')) {
                const conditionMatch = line.match(/if\s*\((.*)\)/);
                if (conditionMatch) {
                    const condition = conditionMatch[1];
                    const result = evaluateCondition(condition);
                    const endIfBlock = findMatchingBrace(i + 1);

                    if (result) { // Condição verdadeira, executa o bloco if
                        // Apenas continua o loop, já que o bloco começa na próxima linha
                        i++; // Pula a linha do "if {"
                    } else { // Condição falsa, pula o bloco if
                        i = endIfBlock; // Pula para o '}'
                        
                        // Checa se existe um bloco else
                        const nextLine = lines[i + 1]?.trim().toLowerCase();
                        if (nextLine === 'else {') {
                           i += 2; // Pula o "else {" para começar a executar o bloco else
                        }
                    }
                }
            } else if (line.trim() === '}') {
                // Se encontramos um '}' e estamos saindo de um bloco 'if' que foi executado,
                // precisamos pular o bloco 'else' correspondente.
                const nextLine = lines[i + 1]?.trim().toLowerCase();
                if (nextLine === 'else {') {
                    const endElseBlock = findMatchingBrace(i + 2);
                    i = endElseBlock; // Pula o bloco else inteiro
                }
            }
        }
    }
};

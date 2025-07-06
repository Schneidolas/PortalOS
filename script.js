document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos da UI e Estados Globais ---
    // (Nenhuma mudança aqui)
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const inputContainer = document.getElementById('input-container');
    const inputLine = document.getElementById('input-line');
    const promptElement = document.getElementById('prompt');
    let isMatrixActive = false, editorState = { isActive: false };
    let currentPath = ['C:'];
    
    // --- Sistema de Arquivos (com um novo script .scc) ---
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'programas': {
                    type: 'directory',
                    children: { 'game.exe': { type: 'program' } }
                },
                'scripts': {
                    type: 'directory',
                    children: {
                        'aventura.scc': { 
                            type: 'file', 
                            content: `// Jogo de Aventura Simples em .SCC
@echo off
cls

print >> Bem-vindo à Caverna do Dragão!
print >> Você vê dois caminhos.
print >> 1. Caminho da Esquerda (escuro)
print >> 2. Caminho da Direita (brilhante)

var ESCOLHA
input >> ESCOLHA

if (ESCOLHA == 1) {
    print >> Você entra no caminho escuro e encontra um baú!
} else {
    print >> Você entra no caminho brilhante e encontra um dragão dormindo!
    print >> Melhor não fazer barulho...
}

%continue%
cls
print >> Fim da demo.`
                        }
                    }
                },
                'README.txt': { type: 'file', content: 'Para testar a nova linguagem, digite:\nlaunch scripts/aventura.scc' }
            }
        }
    };

    // --- Funções Auxiliares, Editores, Executor de Batch ---
    // (O código anterior para print, updatePrompt, editores e executeBatchFile permanece o mesmo)
    // (Vou omiti-los aqui para focar na novidade, mas eles devem estar no seu arquivo)
    function printOutput(text) { /* ... */ }
    function updatePrompt() { /* ... */ }
    function openEditor(fileName, type) { /* ... */ }
    // ... etc ...

    // --- NOVAS FUNÇÕES PARA O INTERPRETADOR SCC ---

    // Pausa a execução e espera pelo espaço
    function waitForSpacebar() {
        return new Promise(resolve => {
            printOutput("Aperte Espaço para continuar...");
            const listener = (e) => {
                if (e.code === 'Space') {
                    e.preventDefault();
                    window.removeEventListener('keydown', listener);
                    resolve();
                }
            };
            window.addEventListener('keydown', listener);
        });
    }

    // Pede input ao usuário (reutilizada do .bat)
    function promptForInput(promptText) {
        return new Promise((resolve) => {
            promptElement.textContent = promptText;
            inputContainer.style.visibility = 'visible';
            inputLine.focus();
            const listener = (e) => {
                if (e.key === 'Enter') {
                    const userInput = inputLine.value;
                    inputLine.value = '';
                    inputLine.removeEventListener('keydown', listener);
                    updatePrompt();
                    printOutput(promptText + userInput);
                    resolve(userInput);
                }
            };
            inputLine.addEventListener('keydown', listener);
        });
    }
    
    // Avalia uma condição simples como "VAR == 1"
    function evaluateCondition(condition, variables) {
        const parts = condition.match(/(.+?)\s*(==|!=|>|<|>=|<=)\s*(.+)/);
        if (!parts) return false;

        let left = parts[1].trim();
        const operator = parts[2].trim();
        let right = parts[3].trim();

        // Pega o valor da variável
        left = variables[left.toUpperCase()] || left;

        // Converte para números se possível, para comparações corretas
        const leftNum = parseFloat(left);
        const rightNum = parseFloat(right);

        if (!isNaN(leftNum) && !isNaN(rightNum)) {
            left = leftNum;
            right = rightNum;
        }

        switch (operator) {
            case '==': return left == right;
            case '!=': return left != right;
            case '>':  return left > right;
            case '<':  return left < right;
            case '>=': return left >= right;
            case '<=': return left <= right;
            default:   return false;
        }
    }


    // --- O INTERPRETADOR PRINCIPAL DA LINGUAGEM .SCC ---
    async function executeSccFile(fileName) {
        const file = getDirectory(currentPath).children[fileName];
        if (!file) { printOutput(`Erro: arquivo SCC não encontrado: ${fileName}`); return; }

        const lines = file.content.split('\n');
        const sccVariables = {};
        let sccEchoOn = true;
        let lastIfResult = false; // Guarda o resultado do último 'if'

        inputContainer.style.visibility = 'hidden'; // Esconde o prompt principal

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Ignora linhas vazias e comentários
            if (line === '' || line.startsWith('//')) continue;
            
            // Tratamento de @echo off
            if (line.toLowerCase() === '@echo off') {
                sccEchoOn = false;
                continue;
            }

            // Mostra o comando se o echo estiver ligado
            if (sccEchoOn) {
                printOutput(line);
            }

            const parts = line.split(' ');
            const command = parts[0].toLowerCase();

            // --- Processamento dos Comandos SCC ---
            if (command === 'print') {
                printOutput(line.substring(line.indexOf('>>') + 2).trim());
            } 
            else if (command === 'var') {
                sccVariables[parts[1].toUpperCase()] = null; // Declara a variável
            } 
            else if (command === 'input') {
                const varName = parts[2].toUpperCase();
                if (varName in sccVariables) {
                    const userInput = await promptForInput(""); // Prompt vazio para input direto
                    sccVariables[varName] = userInput;
                } else {
                    printOutput(`Erro de sintaxe: variável "${parts[2]}" não declarada com 'var'.`);
                }
            } 
            else if (command === 'cls') {
                await commands.limpar();
            } 
            else if (command === '%continue%') {
                await waitForSpacebar();
            } 
            else if (command === 'if') {
                const condition = line.match(/\((.*)\)/)[1];
                const result = evaluateCondition(condition, sccVariables);
                lastIfResult = result;
                
                if (!result) { // Se a condição for falsa, pula o bloco
                    let blockLevel = 1;
                    i++; // Pula a linha do {
                    while (blockLevel > 0 && i < lines.length) {
                        i++;
                        if (lines[i].includes('{')) blockLevel++;
                        if (lines[i].includes('}')) blockLevel--;
                    }
                }
            } 
            else if (command === 'else') {
                if (lastIfResult) { // Se o 'if' anterior foi verdadeiro, pula o bloco 'else'
                    let blockLevel = 1;
                    i++; // Pula a linha do {
                    while (blockLevel > 0 && i < lines.length) {
                        i++;
                        if (lines[i].includes('{')) blockLevel++;
                        if (lines[i].includes('}')) blockLevel--;
                    }
                }
            }
        }
        inputContainer.style.visibility = 'visible';
        inputLine.focus();
    }


    // --- COMANDO 'LAUNCH' ATUALIZADO ---
    const commands = {
        // ... (todos os comandos anteriores)
        launch: async (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: launch [arquivo]'); return; }
            const extension = fileName.split('.').pop().toLowerCase();
            
            if (extension === 'bat') {
                await executeBatchFile(fileName); // Função antiga para .bat
            } else if (extension === 'scc') {
                await executeSccFile(fileName); // Nova função para .scc
            } else if (extension === 'exe') {
                printOutput(`Executando ${fileName}... (Simulação)`);
            } else {
                printOutput(`Extensão de arquivo não suportada para execução: .${extension}`);
            }
        },
        // ... (o resto dos comandos e aliases)
        comandos: () => { /* Atualize o texto de ajuda para incluir a sintaxe .scc */ }
    };

    // Cole o resto do seu script.js aqui para garantir a completude...
    // ... (comandos, aliases, processCommand, init, etc)
    // Exemplo de como o help pode ficar:
    commands.comandos = () => printOutput(`==== LISTA DE COMANDOS DO PORTALOS ====
launch [app]      - Executa um arquivo (.bat, .scc, .exe).
...
<br>-- Sintaxe da Linguagem .SCC --
print >> TEXTO     - Exibe uma mensagem.
var NOME           - Declara uma variável.
input >> NOME      - Pede input e guarda na variável.
if (COND) { ... }  - Bloco condicional.
else { ... }       - Bloco alternativo.
%continue%         - Pausa e espera a barra de espaço.
// COMENTARIO      - Linha ignorada pelo interpretador.
`);

    // ... (resto do seu código)
    async function processCommand(fullCommand) { /* ... */ }
    // ...
    init();

};

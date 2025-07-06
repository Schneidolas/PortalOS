document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos da UI e Estados Globais ---
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const inputContainer = document.getElementById('input-container');
    const inputLine = document.getElementById('input-line');
    const promptElement = document.getElementById('prompt');
    const ideTextarea = document.getElementById('ide-textarea');
    const ideStatusBar = document.getElementById('ide-status-bar');
    const editorWindow = document.getElementById('editor-window');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorStatusBar = document.getElementById('editor-status-bar');
    let matrixInterval;
    let isMatrixActive = false, editorState = { isActive: false }, currentPath = ['C:'];
    const editorState = { isActive: false, activeEditor: null, fileName: null };
    let currentPath = ['C:'];

    // --- Sistema de Arquivos Virtual (com um novo script de exemplo) ---
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
                        'boas-vindas.bat': { type: 'file', content: '@echo off\neco Bem-vindo ao PortalOS!\n\neco Para testar a nova linguagem, digite:\neco   launch scripts/quiz.scc' },
                        'quiz.scc': {
                            type: 'file',
                            content: '@echo off\ncls\nprint >> Você gosta de maça ou banana?\nprint >> 1. Maça\nprint >> 2. Banana\n\nvar fruta\nimput >> fruta\n\nif (fruta == 1) {\n   print >> Maçã é ótima!\n} else {\n   print >> Banana é ótima!\n}\n\n%continue%'
                        }
                    }
                },
            }
        }
    };
    
    // --- Funções Auxiliares e de Editor ---
    // (Cole o código completo das funções da resposta anterior aqui)
    function printOutput(text) { output.innerHTML += `<p>${text.replace(/</g, "<").replace(/>/g, ">")}</p>`; terminal.scrollTop = terminal.scrollHeight; }
    function updatePrompt() { promptElement.textContent = `${currentPath.join('\\')}\\>`; }
    function getDirectory(pathArray) { let dir = fileSystem['C:']; for (let i = 1; i < pathArray.length; i++) { dir = dir?.children?.[pathArray[i]]; } return dir; }
    function openEditor(fileName, type) { editorState.isActive = true; editorState.activeEditor = type; editorState.fileName = fileName; const currentDir = getDirectory(currentPath); const file = currentDir.children[fileName]; const content = (file && file.type === 'file') ? file.content : ''; const statusText = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair sem Salvar`; if (type === 'ide') { ideTextarea.value = content; ideStatusBar.textContent = statusText; terminal.classList.add('ide-mode'); ideTextarea.focus(); } else { editorTextarea.value = content; editorStatusBar.textContent = statusText; editorWindow.style.display = 'flex'; editorTextarea.focus(); } window.addEventListener('keydown', handleEditorKeys); }
    function closeEditor() { if (editorState.activeEditor === 'ide') { terminal.classList.remove('ide-mode'); } else { editorWindow.style.display = 'none'; } editorState.isActive = false; editorState.activeEditor = null; window.removeEventListener('keydown', handleEditorKeys); inputLine.focus(); }
    function saveFile() { const currentDir = getDirectory(currentPath); const content = editorState.activeEditor === 'ide' ? ideTextarea.value : editorTextarea.value; currentDir.children[editorState.fileName] = { type: 'file', content: content }; printOutput(`Arquivo "${editorState.fileName}" salvo.`); closeEditor(); }
    function handleEditorKeys(e) { if (!editorState.isActive) return; if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); } else if (e.ctrlKey && e.key.toLowerCase() === 'q') { e.preventDefault(); closeEditor(); printOutput(`Edição de "${editorState.fileName}" cancelada.`); } }

    function waitForSpace() {
        return new Promise((resolve) => {
            printOutput("Pressione a barra de espaço para continuar...");
            const listener = (e) => {
                if (e.code === 'Space') {
                    e.preventDefault();
                    window.removeEventListener('keydown', listener);
                    // Limpa a mensagem "Pressione espaço"
                    output.removeChild(output.lastChild);
                    resolve();
                }
            };
            window.addEventListener('keydown', listener);
        });
    }
    
    // --- NOVO: Função para pegar input do usuário ---
    function promptForInput(promptText) {
        return new Promise((resolve) => {
            promptElement.textContent = promptText;
            inputContainer.style.visibility = 'visible'; // Garante que esteja visível
            inputLine.focus();

            const listener = (e) => {
                if (e.key === 'Enter') {
                    const userInput = inputLine.value;
                    inputLine.value = '';
                    inputLine.removeEventListener('keydown', listener);
                    updatePrompt(); // Restaura o prompt normal
                    printOutput(promptText + userInput); // Mostra o que o usuário digitou
                    resolve(userInput);
                }
            };
            inputLine.addEventListener('keydown', listener);
        });
    }

    // --- Executor de Scripts (ATUALIZADO PARA VARIÁVEIS E INPUT) ---
    async function executeBatchFile(fileName) {
        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        if (!file || file.type !== 'file') { printOutput(`Erro: arquivo de lote não encontrado: ${fileName}`); return; }

        const batchVariables = {}; // Armazena variáveis para este script
        let batchEchoOn = true;
        const lines = file.content.split('\n');

        inputContainer.style.visibility = 'hidden'; // Esconde o prompt principal durante a execução

        for (let line of lines) {
            // 1. Substituir variáveis (%VAR%)
            line = line.replace(/%([^%]+)%/g, (match, varName) => {
                return batchVariables[varName.toUpperCase()] || '';
            });

            let trimmedLine = line.trim();
            if (trimmedLine === '') continue;

            const commandRaw = trimmedLine.split(' ')[0].toLowerCase();
            let suppressThisLineEcho = trimmedLine.startsWith('@');
            if (suppressThisLineEcho) {
                trimmedLine = trimmedLine.substring(1);
            }

            if (batchEchoOn && !suppressThisLineEcho) {
                printOutput(`${promptElement.textContent}${line.trim()}`);
            }

            // 2. Comandos Especiais de Script
            if (commandRaw === '@echo' && trimmedLine.toLowerCase().includes('off')) {
                batchEchoOn = false;
                continue;
            }
            if (commandRaw === 'rem') continue;
            
            if (commandRaw === 'set' && trimmedLine.toLowerCase().startsWith('set /p ')) {
                const parts = trimmedLine.substring(7).split('=');
                const varName = parts[0].trim().toUpperCase();
                const promptText = parts.slice(1).join('=').trim();
                const userInput = await promptForInput(promptText);
                batchVariables[varName] = userInput;
                continue;
            }

            if (commandRaw === 'set') {
                const parts = trimmedLine.substring(4).split('=');
                if (parts.length > 1) {
                    const varName = parts[0].trim().toUpperCase();
                    const value = parts.slice(1).join('=').trim();
                    batchVariables[varName] = value;
                }
                continue;
            }

            // 3. Executar comando normal
            await processCommand(trimmedLine);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        inputContainer.style.visibility = 'visible'; // Restaura o prompt no final
        inputLine.focus();
    }
    
    // --- Definição dos Comandos (HELP ATUALIZADO) ---
    const commands = {
        comandos: () => printOutput(`==== LISTA DE COMANDOS DO PORTALOS ====
ajuda/help/comandos - Exibe esta lista.
launch [app]      - Executa um arquivo (.bat, .exe).
ls / dir          - Lista arquivos e diretórios.
cd [caminho]      - Muda de diretório. ("cd .." volta).
mkdir [nome]      - Cria um diretório.
touch [arquivo]   - Cria um arquivo de texto vazio.
cat [arquivo]     - Mostra o conteúdo de um arquivo.
ide [arquivo]     - Abre o editor de tela cheia (azul).
edit [arquivo]    - Abre o editor em janela (moderno).
eco [texto]       - Exibe um texto.
data              - Mostra data e hora.
limpar/cls/clear  - Limpa a tela.
matrix            - Entra na Matrix.
<br>-- Comandos de Script (.bat) --
@echo off         - Esconde os comandos seguintes do script.
rem [comentário]  - Adiciona um comentário que será ignorado.
set VAR=VALOR     - Cria/modifica uma variável.
set /p VAR=PROMPT - Pede para o usuário digitar algo e armazena em VAR.
%VAR%             - Usa o valor de uma variável.
<br>-- Nova Linguagem (.scc) --
print >> [texto]  - Exibe texto na tela.
var [nome]        - Declara uma variável.
imput >> [var]    - Pede input e guarda em uma variável.
if (cond) { }     - Bloco condicional.
else { }          - Bloco alternativo.
%continue%        - Pausa e espera a barra de espaço.`),
        // ... (o resto dos comandos permanece igual)
    };
    // (Cole o resto do objeto `commands` e o resto do script da resposta anterior)
    commands.limpar = () => output.innerHTML = '';
    commands.data = () => printOutput(new Date().toLocaleString('pt-BR'));
    commands.eco = (args) => printOutput(args.join(' '));
    commands.ls = () => { const currentDir = getDirectory(currentPath); let content = 'Conteúdo de ' + currentPath.join('\\') + ':\n<br>'; Object.keys(currentDir.children).forEach(key => { const item = currentDir.children[key]; content += item.type === 'directory' ? `[DIR]    ${key}<br>` : `         ${key}<br>`; }); printOutput(content); };
    commands.cd = (args) => { const target = args[0] || ''; if (target === '..') { if (currentPath.length > 1) currentPath.pop(); } else if (target) { const currentDir = getDirectory(currentPath); if (currentDir.children[target]?.type === 'directory') { currentPath.push(target); } else { printOutput(`O sistema não pode encontrar o caminho especificado: ${target}`); } } else { printOutput(currentPath.join('\\')); } updatePrompt(); };
    commands.cat = (args) => { const fileName = args[0]; const file = getDirectory(currentPath).children[fileName]; if (file?.type === 'file') { printOutput(file.content); } else { printOutput(`Arquivo não encontrado: ${fileName}`); } };
    commands.touch = (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: touch [nome_do_arquivo]'); return; } const currentDir = getDirectory(currentPath); if (currentDir.children[fileName]) { printOutput(`Um arquivo ou diretório com o nome "${fileName}" já existe.`); } else { currentDir.children[fileName] = { type: 'file', content: '' }; printOutput(`Arquivo "${fileName}" criado.`); } };
    commands.mkdir = (args) => { const dirName = args[0]; if (!dirName) { printOutput('Uso: mkdir [nome]'); return; } const currentDir = getDirectory(currentPath); if (currentDir.children[dirName]) { printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`); } else { currentDir.children[dirName] = { type: 'directory', children: {} }; } };
    commands.ide = (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: ide [nome_do_arquivo]'); return; } openEditor(fileName, 'ide'); };
    commands.edit = (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: edit [nome_do_arquivo]'); return; } openEditor(fileName, 'edit'); };
    commands.launch = async (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: launch [arquivo]'); return; } const extension = fileName.split('.').pop().toLowerCase(); const file = getDirectory(currentPath).children[fileName]; if (!file) { printOutput(`Arquivo não encontrado: ${fileName}`); return; } if (extension === 'bat') { await executeBatchFile(fileName); } else if (extension === 'exe' && file.type === 'program') { printOutput(`Executando ${fileName}... (Simulação)`); } else { printOutput(`Não é possível executar "${fileName}". Não é um programa ou script válido.`); } };
    commands.matrix = () => { if (isMatrixActive) return; isMatrixActive = true; terminal.classList.add('matrix-mode'); inputContainer.style.display = 'none'; const matrixP = document.createElement('p'); output.appendChild(matrixP); matrixInterval = setInterval(() => { matrixP.textContent += Array.from({length: 300}, () => Math.random() > 0.5 ? '1' : '0').join(''); terminal.scrollTop = terminal.scrollHeight; }, 50); window.addEventListener('keydown', () => { isMatrixActive = false; clearInterval(matrixInterval); terminal.classList.remove('matrix-mode'); inputContainer.style.display = 'flex'; printOutput("\n...saindo da Matrix."); inputLine.focus(); }, { once: true }); };
    commands.help = commands.comandos;
    commands.ajuda = commands.comandos;
    commands.cls = commands.limpar;
    commands.clear = commands.limpar;
    commands.dir = commands.ls;

    async function processCommand(fullCommand) { const parts = fullCommand.trim().split(' '); const command = parts[0].toLowerCase(); const args = parts.slice(1); if (command in commands) { await commands[command](args); } else if (command !== '') { printOutput(`'${command}' não é reconhecido como um comando interno.`); } }
    inputLine.addEventListener('keydown', async (e) => { if (e.key !== 'Enter' || isMatrixActive || editorState.isActive) return; const commandToProcess = inputLine.value; printOutput(`${promptElement.textContent}${commandToProcess}`); inputLine.value = ''; await processCommand(commandToProcess); updatePrompt(); });
    async function init() { printOutput("PortalOS [Versão 2.7 - Interactive Update]"); printOutput("(c) Schneidolas Corporation. Todos os direitos reservados."); printOutput(""); updatePrompt(); await processCommand('launch scripts/boas-vindas.bat'); updatePrompt(); }
    init();

     launch: async (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: launch [arquivo]'); return; }

            const extension = fileName.split('.').pop().toLowerCase();
            const file = getDirectory(currentPath).children[fileName];

            if (!file) { printOutput(`Arquivo não encontrado: ${fileName}`); return; }

            // Esconde o prompt principal durante a execução de scripts
            inputContainer.style.visibility = 'hidden';

            if (extension === 'scc') {
                const api = {
                    printOutput: printOutput,
                    promptForInput: promptForInput,
                    waitForSpace: waitForSpace,
                    cls: commands.limpar,
                    prompt: promptElement.textContent // Passa o prompt atual para o echo
                };
                await window.sccInterpreter.execute(file.content, api);
            } else if (extension === 'bat') {
                await executeBatchFile(fileName);
            } else if (extension === 'exe' && file.type === 'program') {
                printOutput(`Executando ${fileName}... (Simulação)`);
            } else {
                printOutput(`Não é possível executar "${fileName}".`);
            }
            
            // Reexibe o prompt no final
            inputContainer.style.visibility = 'visible';
            inputLine.focus();
        },
    };
});

document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos da UI ---
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const inputContainer = document.getElementById('input-container');
    const inputLine = document.getElementById('input-line');
    const promptElement = document.getElementById('prompt');
    // IDE Antiga
    const ideTextarea = document.getElementById('ide-textarea');
    const ideStatusBar = document.getElementById('ide-status-bar');
    // IDE Moderna
    const editorWindow = document.getElementById('editor-window');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorStatusBar = document.getElementById('editor-status-bar');

    // --- Estados Globais ---
    let matrixInterval;
    let isMatrixActive = false;
    const editorState = {
        isActive: false,
        activeEditor: null, // 'ide' ou 'edit'
        fileName: null,
    };
    let currentPath = ['C:'];

    // --- Sistema de Arquivos Virtual ---
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'programas': {
                    type: 'directory',
                    children: {
                        'game.exe': { type: 'program' }
                    }
                },
                'scripts': {
                    type: 'directory',
                    children: {
                        'boas-vindas.bat': { type: 'file', content: 'eco Bem-vindo ao PortalOS!\n\neco Para ver os comandos, digite "help".\neco Para criar seu proprio script, digite "ide meu-script.bat"' }
                    }
                },
                'README.txt': { type: 'file', content: 'Olá! Este é o sistema PortalOS.' }
            }
        }
    };
    
    // --- Funções Auxiliares ---
    function printOutput(text) { output.innerHTML += `<p>${text.replace(/</g, "<").replace(/>/g, ">")}</p>`; terminal.scrollTop = terminal.scrollHeight; }
    function updatePrompt() { promptElement.textContent = `${currentPath.join('\\')}\\>`; }
    function getDirectory(pathArray) { let dir = fileSystem['C:']; for (let i = 1; i < pathArray.length; i++) { dir = dir?.children?.[pathArray[i]]; } return dir; }

    // --- Lógica dos Editores (Unificada) ---
    function openEditor(fileName, type) { /* ... (código do editor permanece o mesmo) ... */ }
    function closeEditor() { /* ... (código do editor permanece o mesmo) ... */ }
    function saveFile() { /* ... (código do editor permanece o mesmo) ... */ }
    function handleEditorKeys(e) { /* ... (código do editor permanece o mesmo) ... */ }
    // (Cole o código completo dos editores da resposta anterior aqui se precisar)
    function openEditor(fileName, type) {
        editorState.isActive = true;
        editorState.activeEditor = type;
        editorState.fileName = fileName;
        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        const content = (file && file.type === 'file') ? file.content : '';
        const statusText = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair sem Salvar`;
        if (type === 'ide') {
            ideTextarea.value = content;
            ideStatusBar.textContent = statusText;
            terminal.classList.add('ide-mode');
            ideTextarea.focus();
        } else {
            editorTextarea.value = content;
            editorStatusBar.textContent = statusText;
            editorWindow.style.display = 'flex';
            editorTextarea.focus();
        }
        window.addEventListener('keydown', handleEditorKeys);
    }
    function closeEditor() {
        if (editorState.activeEditor === 'ide') {
            terminal.classList.remove('ide-mode');
        } else {
            editorWindow.style.display = 'none';
        }
        editorState.isActive = false;
        editorState.activeEditor = null;
        window.removeEventListener('keydown', handleEditorKeys);
        inputLine.focus();
    }
    function saveFile() {
        const currentDir = getDirectory(currentPath);
        const content = editorState.activeEditor === 'ide' ? ideTextarea.value : editorTextarea.value;
        currentDir.children[editorState.fileName] = { type: 'file', content: content };
        printOutput(`Arquivo "${editorState.fileName}" salvo.`);
        closeEditor();
    }
    function handleEditorKeys(e) {
        if (!editorState.isActive) return;
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); } 
        else if (e.ctrlKey && e.key.toLowerCase() === 'q') { e.preventDefault(); closeEditor(); printOutput(`Edição de "${editorState.fileName}" cancelada.`); }
    }


    // --- Executor de Scripts ---
    async function executeBatchFile(fileName) {
        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        if (!file || file.type !== 'file') { printOutput(`Erro: arquivo de lote não encontrado: ${fileName}`); return; }
        const lines = file.content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.toLowerCase().startsWith('rem')) continue;
            printOutput(`${promptElement.textContent}${trimmedLine}`);
            await processCommand(trimmedLine);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    // --- Definição dos Comandos ---
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
matrix            - Entra na Matrix.`),
        limpar: () => output.innerHTML = '',
        data: () => printOutput(new Date().toLocaleString('pt-BR')),
        eco: (args) => printOutput(args.join(' ')),
        ls: () => {
            const currentDir = getDirectory(currentPath);
            let content = 'Conteúdo de ' + currentPath.join('\\') + ':\n<br>';
            Object.keys(currentDir.children).forEach(key => {
                const item = currentDir.children[key];
                content += item.type === 'directory' ? `[DIR]    ${key}<br>` : `         ${key}<br>`;
            });
            printOutput(content);
        },
        cd: (args) => {
            const target = args[0] || '';
            if (target === '..') { if (currentPath.length > 1) currentPath.pop(); } 
            else if (target) {
                const currentDir = getDirectory(currentPath);
                if (currentDir.children[target]?.type === 'directory') { currentPath.push(target); } 
                else { printOutput(`O sistema não pode encontrar o caminho especificado: ${target}`); }
            } else { printOutput(currentPath.join('\\')); }
            updatePrompt();
        },
        cat: (args) => {
            const fileName = args[0];
            const file = getDirectory(currentPath).children[fileName];
            if (file?.type === 'file') { printOutput(file.content); } 
            else { printOutput(`Arquivo não encontrado: ${fileName}`); }
        },
        touch: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: touch [nome_do_arquivo]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[fileName]) { printOutput(`Um arquivo ou diretório com o nome "${fileName}" já existe.`); } 
            else { currentDir.children[fileName] = { type: 'file', content: '' }; printOutput(`Arquivo "${fileName}" criado.`); }
        },
        mkdir: (args) => {
            const dirName = args[0];
            if (!dirName) { printOutput('Uso: mkdir [nome]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[dirName]) { printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`); } 
            else { currentDir.children[dirName] = { type: 'directory', children: {} }; }
        },
        ide: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: ide [nome_do_arquivo]'); return; }
            openEditor(fileName, 'ide');
        },
        edit: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: edit [nome_do_arquivo]'); return; }
            openEditor(fileName, 'edit');
        },
        launch: async (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: launch [arquivo]'); return; }
            const extension = fileName.split('.').pop().toLowerCase();
            const file = getDirectory(currentPath).children[fileName];
            if (!file) { printOutput(`Arquivo não encontrado: ${fileName}`); return; }
            if (extension === 'bat') { await executeBatchFile(fileName); } 
            else if (extension === 'exe' && file.type === 'program') { printOutput(`Executando ${fileName}... (Simulação)`); } 
            else { printOutput(`Não é possível executar "${fileName}". Não é um programa ou script válido.`); }
        },
        // --- FUNÇÃO MATRIX RESTAURADA ---
        matrix: () => {
            if (isMatrixActive) return;
            isMatrixActive = true;
            terminal.classList.add('matrix-mode');
            inputContainer.style.display = 'none';
            
            const matrixP = document.createElement('p');
            output.appendChild(matrixP);

            matrixInterval = setInterval(() => {
                matrixP.textContent += Array.from({length: 300}, () => Math.random() > 0.5 ? '1' : '0').join('');
                terminal.scrollTop = terminal.scrollHeight;
            }, 50);

            window.addEventListener('keydown', () => {
                isMatrixActive = false;
                clearInterval(matrixInterval);
                terminal.classList.remove('matrix-mode');
                inputContainer.style.display = 'flex';
                printOutput("\n...saindo da Matrix.");
                inputLine.focus();
            }, { once: true });
        }
    };
    // Aliases
    commands.help = commands.comandos;
    commands.ajuda = commands.comandos;
    commands.cls = commands.limpar;
    commands.clear = commands.limpar;
    commands.dir = commands.ls;

    // --- Processador de Comandos Principal ---
    async function processCommand(fullCommand) {
        const parts = fullCommand.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        if (command in commands) {
            await commands[command](args);
        } else if (command !== '') {
            printOutput(`'${command}' não é reconhecido como um comando interno.`);
        }
    }

    // --- Loop de Entrada ---
    inputLine.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter' || isMatrixActive || editorState.isActive) return;
        const commandToProcess = inputLine.value;
        printOutput(`${promptElement.textContent}${commandToProcess}`);
        inputLine.value = '';
        await processCommand(commandToProcess);
        updatePrompt();
    });

    // --- Inicialização ---
    async function init() {
        printOutput("PortalOS [Versão 2.5 - Stable]");
        printOutput("(c) Schneidolas Corporation. Todos os direitos reservados.");
        printOutput("");
        updatePrompt();
        await processCommand('launch scripts/boas-vindas.bat');
        updatePrompt();
    }
    init();
});

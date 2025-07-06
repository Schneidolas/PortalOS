document.addEventListener('DOMContentLoaded', function() {
    // Elementos da UI
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const inputContainer = document.getElementById('input-container');
    const inputLine = document.getElementById('input-line');
    const promptElement = document.getElementById('prompt');
    const editorTextarea = document.getElementById('editor-textarea');
    const statusBar = document.getElementById('status-bar');

    // Estados
    let matrixInterval;
    let isMatrixActive = false;
    const editorState = {
        isActive: false,
        fileName: null,
    };
    let currentPath = ['C:'];

    // Sistema de Arquivos Virtual
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'scripts': {
                    type: 'directory',
                    children: {
                        'boas-vindas.bat': {
                            type: 'file',
                            content: 'eco Bem-vindo ao executor de scripts do PortalOS!\neco\neco Este arquivo .bat está executando comandos...\ndata'
                        }
                    }
                },
                'README.txt': { type: 'file', content: 'Crie seu próprio script com "edit meu-script.bat",\nescreva comandos como "eco Ola" e "limpar",\nsalve com Ctrl+S e execute digitando "meu-script.bat"!' }
            }
        }
    };

    // --- FUNÇÕES AUXILIARES ---
    function printOutput(text, isHTML = false) {
        const p = document.createElement('p');
        if (isHTML) { p.innerHTML = text; } 
        else { p.textContent = text; }
        output.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function updatePrompt() {
        promptElement.textContent = `${currentPath.join('\\')}\\>`;
    }

    function getDirectory(pathArray) {
        let dir = fileSystem['C:'];
        for (let i = 1; i < pathArray.length; i++) {
            dir = dir?.children?.[pathArray[i]];
        }
        return dir;
    }

    // --- LÓGICA DO EDITOR ---
    function openEditor(fileName) {
        editorState.isActive = true;
        editorState.fileName = fileName;

        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        
        editorTextarea.value = (file && file.type === 'file') ? file.content : '';
        statusBar.textContent = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair sem Salvar`;
        
        terminal.classList.add('editor-mode');
        editorTextarea.focus();
        
        window.addEventListener('keydown', handleEditorKeys);
    }

    function closeEditor() {
        editorState.isActive = false;
        terminal.classList.remove('editor-mode');
        window.removeEventListener('keydown', handleEditorKeys);
        inputLine.focus();
    }

    function saveFile() {
        const currentDir = getDirectory(currentPath);
        const newContent = editorTextarea.value;
        const isNewFile = !currentDir.children[editorState.fileName];

        currentDir.children[editorState.fileName] = { type: 'file', content: newContent };
        
        closeEditor();
        printOutput(`Arquivo "${editorState.fileName}" salvo.`);
    }

    function handleEditorKeys(e) {
        if (!editorState.isActive) return;
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); } 
        else if (e.ctrlKey && e.key.toLowerCase() === 'q') { e.preventDefault(); closeEditor(); printOutput(`Edição de "${editorState.fileName}" cancelada.`); }
    }

    // --- LÓGICA DO EXECUTOR DE BATCH (.BAT) ---
    async function executeBatchFile(fileName) {
        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];

        if (!file || file.type !== 'file') {
            printOutput(`Erro: arquivo de lote não encontrado: ${fileName}`);
            return;
        }

        const lines = file.content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.startsWith('::')) continue; // Ignora linhas vazias e comentários

            printOutput(`${promptElement.textContent}${trimmedLine}`);
            await processCommand(trimmedLine);
        }
    }

    // --- PROCESSADOR DE COMANDOS ---
    async function processCommand(fullCommand) {
        const parts = fullCommand.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        const currentDir = getDirectory(currentPath);

        if (command in commands) {
            await commands[command](args);
        } else if (currentDir.children[command] && currentDir.children[command].type === 'file') {
            // Tenta executar o arquivo (ex: teste.bat)
            await executeBatchFile(command);
        } else if (command !== '') {
            printOutput(`'${command}' não é reconhecido como um comando interno, programa operável ou arquivo em lotes.`);
        }
    }

    // --- DEFINIÇÃO DOS COMANDOS ---
    const commands = {
        comandos: () => printOutput(`==== LISTA DE COMANDOS DO PORTALOS ====
ajuda         - Exibe esta mensagem de ajuda.
comandos      - Exibe a lista detalhada de comandos.
ls / dir      - Lista arquivos e diretórios no local atual.
cd [caminho]  - Muda para o diretório especificado. "cd .." volta um nível.
mkdir [nome]  - Cria um novo diretório.
cat [arquivo] - Exibe o conteúdo de um arquivo de texto.
touch [arq]   - Cria um arquivo de texto vazio.
edit [arq]    - Abre um arquivo no editor de texto (estilo clássico).
eco [texto]   - Exibe o texto fornecido.
sysinfo       - Mostra informações básicas do sistema.
ver           - Mostra a versão do PortalOS.
data          - Exibe a data e hora atuais.
limpar        - Limpa a tela do terminal.
matrix        - Entra na Matrix.
`, true),
        limpar: () => output.innerHTML = '',
        data: () => printOutput(new Date().toLocaleString('pt-BR')),
        ver: () => printOutput('PortalOS [Versão 2.2 - User Friendly]'),
        sysinfo: () => printOutput(`Informações do Sistema:\n  OS: PortalOS v2.2\n  Intérprete: JS Batch Executor`),
        eco: (args) => printOutput(args.join(' ')),
        dir: () => commands.ls(),
        ls: () => {
            const currentDir = getDirectory(currentPath);
            let content = 'Conteúdo de ' + currentPath.join('\\') + ':\n\n';
            Object.keys(currentDir.children).forEach(key => {
                const item = currentDir.children[key];
                content += item.type === 'directory' ? `[DIR]    ${key}\n` : `         ${key}\n`;
            });
            printOutput(content);
        },
        cd: (args) => {
            const target = args[0];
            if (!target) { printOutput(currentPath.join('\\')); return; }
            if (target === '..') {
                if (currentPath.length > 1) currentPath.pop();
            } else {
                const currentDir = getDirectory(currentPath);
                if (currentDir.children[target]?.type === 'directory') {
                    currentPath.push(target);
                } else {
                    printOutput(`O sistema não pode encontrar o caminho especificado: ${target}`);
                }
            }
            updatePrompt();
        },
        cat: (args) => {
            const fileName = args[0];
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[fileName]?.type === 'file') {
                printOutput(currentDir.children[fileName].content);
            } else {
                printOutput(`Arquivo não encontrado: ${fileName}`);
            }
        },
        mkdir: (args) => {
            const dirName = args[0];
            if (!dirName) { printOutput('Uso: mkdir [nome]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[dirName]) { printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`); } 
            else { currentDir.children[dirName] = { type: 'directory', children: {} }; printOutput(`Diretório ${dirName} criado.`); }
        },
        touch: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: touch [arquivo]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[fileName]) { printOutput(`Um arquivo ou diretório ${fileName} já existe.`); } 
            else { currentDir.children[fileName] = { type: 'file', content: '' }; printOutput(`Arquivo ${fileName} criado.`); }
        },
        edit: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: edit [arquivo]'); return; }
            if (getDirectory(currentPath).children[fileName]?.type === 'directory') { printOutput(`Erro: "${fileName}" é um diretório.`); return; }
            openEditor(fileName);
        },
        matrix: () => {
            if (isMatrixActive) return;
            isMatrixActive = true;
            terminal.classList.add('matrix-mode');
            inputContainer.style.display = 'none';
            const matrixP = document.createElement('p');
            output.appendChild(matrixP);
            matrixInterval = setInterval(() => {
                matrixP.textContent += Array.from({length: 200}, () => Math.random() > 0.5 ? '1' : '0').join('');
                terminal.scrollTop = terminal.scrollHeight;
            }, 100);
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
    
    // --- LOOP PRINCIPAL DE ENTRADA ---
    inputLine.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter' || isMatrixActive || editorState.isActive) return;

        const commandToProcess = inputLine.value;
        printOutput(`${promptElement.textContent}${commandToProcess}`);
        inputLine.value = '';

        await processCommand(commandToProcess);
        updatePrompt();
        terminal.scrollTop = terminal.scrollHeight;
    });

    // Inicialização
    printOutput("PortalOS [Versão 2.2 - User Friendly]");
    printOutput("(c) Schneidolas Corporation. Todos os direitos reservados.");
    printOutput("");
    updatePrompt();
    processCommand('cd scripts') // Entra na pasta de scripts pra começar
        .then(() => processCommand('boas-vindas.bat')); // Executa o script de boas-vindas
});

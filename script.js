document.addEventListener('DOMContentLoaded', function() {
    // Elementos do Terminal
    const terminal = document.getElementById('terminal');
    const inputLine = document.getElementById('input-line');
    const output = document.getElementById('output');
    const promptElement = document.getElementById('prompt');
    const inputContainer = document.getElementById('input-container');

    // Elementos do Editor
    const editorWindow = document.getElementById('editor-window');
    const editorStatus = document.getElementById('editor-status-bar');
    const editorTextarea = document.getElementById('editor-textarea');

    let matrixInterval;
    let isMatrixActive = false;

    // Estado do Editor
    const editorState = {
        isActive: false,
        fileName: null,
        originalContent: '',
        isNewFile: false
    };

    // Simulação de um sistema de arquivos
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'docs': {
                    type: 'directory',
                    children: {
                        'readme.txt': { type: 'file', content: 'Este é um arquivo de exemplo.\nUse o comando "edit" para modificá-lo!' }
                    }
                },
                'bem-vindo.txt': { type: 'file', content: 'Bem-vindo ao PortalOS v2.2!\nDigite "comandos" para ver a lista de comandos.' }
            }
        }
    };

    let currentPath = ['C:'];

    function printOutput(text, isHTML = false) {
        const p = document.createElement('p');
        if (isHTML) {
            p.innerHTML = text;
        } else {
            p.textContent = text;
        }
        output.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function updatePrompt() {
        promptElement.textContent = `${currentPath.join('\\')}\\>`;
    }

    function getDirectory(pathArray) {
        let dir = fileSystem['C:'];
        for (let i = 1; i < pathArray.length; i++) {
            if (dir.children && dir.children[pathArray[i]]) {
                dir = dir.children[pathArray[i]];
            } else {
                return null; // Caminho não existe
            }
        }
        return dir;
    }

    // --- LÓGICA DO EDITOR ---
    function openEditor(fileName) {
        editorState.isActive = true;
        editorState.fileName = fileName;

        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        
        if (file && file.type === 'file') {
            editorState.originalContent = file.content;
            editorState.isNewFile = false;
        } else {
            editorState.originalContent = '';
            editorState.isNewFile = true;
        }
        
        editorTextarea.value = editorState.originalContent;
        editorStatus.textContent = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair sem Salvar`;
        
        editorWindow.style.display = 'flex';
        editorTextarea.focus();
        
        window.addEventListener('keydown', handleEditorKeys);
    }

    function closeEditor() {
        editorState.isActive = false;
        editorWindow.style.display = 'none';
        window.removeEventListener('keydown', handleEditorKeys);
        inputLine.focus();
    }

    function saveFile() {
        const currentDir = getDirectory(currentPath);
        const newContent = editorTextarea.value;

        if (editorState.isNewFile) {
             currentDir.children[editorState.fileName] = { type: 'file', content: newContent };
             printOutput(`Arquivo "${editorState.fileName}" criado e salvo.`);
        } else {
            currentDir.children[editorState.fileName].content = newContent;
            printOutput(`Arquivo "${editorState.fileName}" salvo.`);
        }
        closeEditor();
    }

    function handleEditorKeys(e) {
        if (!editorState.isActive) return;

        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveFile();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            e.preventDefault();
            printOutput(`Edição de "${editorState.fileName}" cancelada.`);
            closeEditor();
        }
    }

    // --- LÓGICA DA MATRIX ---
    function startMatrix() {
        if (isMatrixActive) return;
        isMatrixActive = true;
        
        terminal.classList.add('matrix-mode');
        inputContainer.style.display = 'none'; // Esconde o prompt
        
        const matrixOutput = document.createElement('p');
        output.appendChild(matrixOutput);

        matrixInterval = setInterval(() => {
            let text = '';
            for (let i = 0; i < 200; i++) {
                text += Math.random() > 0.5 ? '1' : '0';
            }
            matrixOutput.textContent += text;
            terminal.scrollTop = terminal.scrollHeight;
        }, 100);

        window.addEventListener('keydown', stopMatrix, { once: true });
    }

    function stopMatrix() {
        if (!isMatrixActive) return;
        isMatrixActive = false;
        
        clearInterval(matrixInterval);
        terminal.classList.remove('matrix-mode');
        inputContainer.style.display = 'flex'; // Mostra o prompt novamente
        
        printOutput("\n...saindo da Matrix.");
        inputLine.focus();
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
edit [arq]    - Abre um arquivo no editor de texto interno.
eco [texto]   - Exibe o texto fornecido.
sysinfo       - Mostra informações básicas do sistema.
ver           - Mostra a versão do PortalOS.
data          - Exibe a data e hora atuais.
limpar        - Limpa a tela do terminal.
matrix        - Entra na Matrix.
=======================================`, true),
        limpar: () => output.innerHTML = '',
        data: () => printOutput(new Date().toLocaleString('pt-BR')),
        ver: () => printOutput('PortalOS [Versão 2.2]'),
        sysinfo: () => printOutput(`Informações do Sistema:\n  OS: PortalOS v2.2 (Web-based)\n  CPU: Emulated JS Core\n  RAM: (Depende do seu Navegador)\n  Usuário: Guest`),
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
            if (!target) {
                printOutput(currentPath.join('\\'));
                return;
            }
            if (target === '..') {
                if (currentPath.length > 1) currentPath.pop();
            } else {
                const currentDir = getDirectory(currentPath);
                if (currentDir.children[target] && currentDir.children[target].type === 'directory') {
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
            if (currentDir.children[fileName] && currentDir.children[fileName].type === 'file') {
                printOutput(currentDir.children[fileName].content);
            } else {
                printOutput(`Arquivo não encontrado: ${fileName}`);
            }
        },
        mkdir: (args) => {
            const dirName = args[0];
            if (!dirName) { printOutput('Uso: mkdir [nome_do_diretorio]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[dirName]) {
                printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`);
            } else {
                currentDir.children[dirName] = { type: 'directory', children: {} };
                printOutput(`Diretório ${dirName} criado.`);
            }
        },
        touch: (args) => {
            const fileName = args[0];
            if (!fileName) { printOutput('Uso: touch [nome_do_arquivo]'); return; }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[fileName]) {
                printOutput(`Um arquivo ou diretório ${fileName} já existe.`);
            } else {
                currentDir.children[fileName] = { type: 'file', content: '' };
                printOutput(`Arquivo ${fileName} criado.`);
            }
        },
        edit: (args) => {
            const fileName = args[0];
            if (!fileName) {
                printOutput('Uso: edit [nome_do_arquivo]');
                return;
            }
            const currentDir = getDirectory(currentPath);
            if (currentDir.children[fileName] && currentDir.children[fileName].type === 'directory') {
                printOutput(`Erro: "${fileName}" é um diretório.`);
                return;
            }
            openEditor(fileName);
        },
        matrix: () => {
            printOutput("Entrando na Matrix... Pressione qualquer tecla para sair.");
            setTimeout(startMatrix, 300);
        }
    };
    
    // --- INICIALIZAÇÃO DO TERMINAL ---
    function handleCommand(e) {
        if (isMatrixActive || editorState.isActive) return; // Bloqueia input durante Matrix/Editor
        
        if (e.key === 'Enter') {
            const fullCommand = inputLine.value;
            const parts = fullCommand.trim().split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            printOutput(`${promptElement.textContent}${fullCommand}`);
            
            if (command in commands) {
                commands[command](args);
            } else if (command !== '') {
                printOutput(`'${command}' não é reconhecido como um comando interno.`);
            }

            inputLine.value = '';
            terminal.scrollTop = terminal.scrollHeight;
        }
    }

    inputLine.addEventListener('keydown', handleCommand);
    
    printOutput("PortalOS [Versão 2.2]");
    printOutput("(c) Schneidolas Corporation. Todos os direitos reservados.");
    printOutput('Digite "comandos" para ver a lista de comandos.');
    printOutput("");
    updatePrompt();
});

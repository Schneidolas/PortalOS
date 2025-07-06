document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const inputContainer = document.getElementById('input-container');
    const inputLine = document.getElementById('input-line');
    const promptElement = document.getElementById('prompt');
    const editorContainer = document.getElementById('editor-container');
    const editorGutter = document.getElementById('editor-gutter');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorStatus = document.getElementById('editor-status-bar');

    // Estados do sistema
    let matrixInterval;
    let isMatrixActive = false;
    const editorState = {
        isActive: false,
        fileName: null,
        isNewFile: false
    };

    // ... (fileSystem e funções de diretório permanecem as mesmas) ...
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'docs': {
                    type: 'directory',
                    children: {
                        'README.txt': { type: 'file', content: '# Olha que IDE ~maravilhosa~\n#\n# Você pode editar este arquivo.\n# Pressione Ctrl+S para salvar e sair.\n# Pressione Ctrl+Q para sair sem salvar.' }
                    }
                },
                'bem-vindo.txt': { type: 'file', content: 'Bem-vindo ao PortalOS v2.2!\nDigite "comandos" para ver a lista de comandos.' }
            }
        }
    };
    let currentPath = ['C:'];
    function getDirectory(pathArray) { let dir = fileSystem['C:']; for (let i = 1; i < pathArray.length; i++) { if (dir.children && dir.children[pathArray[i]]) { dir = dir.children[pathArray[i]]; } else { return null; } } return dir; }
    function printOutput(text, isHTML = false) { const p = document.createElement('p'); if (isHTML) { p.innerHTML = text; } else { p.textContent = text; } output.appendChild(p); terminal.scrollTop = terminal.scrollHeight; }
    function updatePrompt() { promptElement.textContent = `${currentPath.join('\\')}\\>`; }


    // --- LÓGICA DO EDITOR ATUALIZADA ---
    function openEditor(fileName) {
        editorState.isActive = true;
        editorState.fileName = fileName;

        const currentDir = getDirectory(currentPath);
        const file = currentDir.children[fileName];
        
        editorTextarea.value = (file && file.type === 'file') ? file.content : '';
        editorState.isNewFile = !(file && file.type === 'file');
        
        editorStatus.textContent = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair sem Salvar`;
        
        // Gera a calha com '#'
        let gutterContent = '';
        for (let i = 0; i < 100; i++) { // Gera linhas suficientes
            gutterContent += '#\n';
        }
        editorGutter.textContent = gutterContent;
        
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
    
    // --- (Lógica da Matrix e outros comandos permanecem os mesmos) ---
    function startMatrix() { if (isMatrixActive) return; isMatrixActive = true; terminal.classList.add('matrix-mode'); inputContainer.style.display = 'none'; const matrixOutput = document.createElement('p'); output.appendChild(matrixOutput); matrixInterval = setInterval(() => { let text = ''; for (let i = 0; i < 200; i++) { text += Math.random() > 0.5 ? '1' : '0'; } matrixOutput.textContent += text; terminal.scrollTop = terminal.scrollHeight; }, 100); window.addEventListener('keydown', stopMatrix, { once: true }); }
    function stopMatrix() { if (!isMatrixActive) return; isMatrixActive = false; clearInterval(matrixInterval); terminal.classList.remove('matrix-mode'); inputContainer.style.display = 'flex'; printOutput("\n...saindo da Matrix."); inputLine.focus(); }
    const commands = {
        comandos: () => printOutput(`==== LISTA DE COMANDOS DO PORTALOS ==== ... (restante dos comandos)`), // Mantive abreviado para focar na mudança
        limpar: () => output.innerHTML = '',
        data: () => printOutput(new Date().toLocaleString('pt-BR')),
        ver: () => printOutput('PortalOS [Versão 2.2 - User Friendly]'),
        sysinfo: () => printOutput(`Informações do Sistema:\n  OS: PortalOS v2.2 (Web-based)\n  CPU: Emulated JS Core\n  RAM: (Depende do seu Navegador)\n  Usuário: Guest`),
        eco: (args) => printOutput(args.join(' ')),
        dir: () => commands.ls(),
        ls: () => { const currentDir = getDirectory(currentPath); let content = 'Conteúdo de ' + currentPath.join('\\') + ':\n\n'; Object.keys(currentDir.children).forEach(key => { const item = currentDir.children[key]; content += item.type === 'directory' ? `[DIR]    ${key}\n` : `         ${key}\n`; }); printOutput(content); },
        cd: (args) => { const target = args[0]; if (!target) { printOutput(currentPath.join('\\')); return; } if (target === '..') { if (currentPath.length > 1) currentPath.pop(); } else { const currentDir = getDirectory(currentPath); if (currentDir.children[target] && currentDir.children[target].type === 'directory') { currentPath.push(target); } else { printOutput(`O sistema não pode encontrar o caminho especificado: ${target}`); } } updatePrompt(); },
        cat: (args) => { const fileName = args[0]; const currentDir = getDirectory(currentPath); if (currentDir.children[fileName] && currentDir.children[fileName].type === 'file') { printOutput(currentDir.children[fileName].content); } else { printOutput(`Arquivo não encontrado: ${fileName}`); } },
        mkdir: (args) => { const dirName = args[0]; if (!dirName) { printOutput('Uso: mkdir [nome_do_diretorio]'); return; } const currentDir = getDirectory(currentPath); if (currentDir.children[dirName]) { printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`); } else { currentDir.children[dirName] = { type: 'directory', children: {} }; printOutput(`Diretório ${dirName} criado.`); } },
        touch: (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: touch [nome_do_arquivo]'); return; } const currentDir = getDirectory(currentPath); if (currentDir.children[fileName]) { printOutput(`Um arquivo ou diretório ${fileName} já existe.`); } else { currentDir.children[fileName] = { type: 'file', content: '' }; printOutput(`Arquivo ${fileName} criado.`); } },
        edit: (args) => { const fileName = args[0]; if (!fileName) { printOutput('Uso: edit [nome_do_arquivo]'); return; } const currentDir = getDirectory(currentPath); if (currentDir.children[fileName] && currentDir.children[fileName].type === 'directory') { printOutput(`Erro: "${fileName}" é um diretório.`); return; } openEditor(fileName); },
        matrix: () => { printOutput("Entrando na Matrix... Pressione qualquer tecla para sair."); setTimeout(startMatrix, 300); }
    };

    // --- INICIALIZAÇÃO DO TERMINAL ---
    inputLine.addEventListener('keydown', (e) => {
        if (isMatrixActive || editorState.isActive) return;
        if (e.key === 'Enter') {
            const fullCommand = inputLine.value;
            const parts = fullCommand.trim().split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            printOutput(`${promptElement.textContent}${fullCommand}`);
            if (commands[command]) {
                commands[command](args);
            } else if (command !== '') {
                printOutput(`'${command}' não é reconhecido como um comando interno.`);
            }
            inputLine.value = '';
            terminal.scrollTop = terminal.scrollHeight;
        }
    });

    printOutput("PortalOS [Versão 2.2 - User Friendly]");
    printOutput("(c) Schneidolas Corporation. Todos os direitos reservados.");
    printOutput('Digite "comandos" para ver a lista de comandos.');
    printOutput("");
    updatePrompt();
    inputLine.focus();
});

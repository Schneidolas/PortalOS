class PortalOS {
    // MUDANÇA: O init agora é um constructor, que roda automaticamente.
    constructor() {
        // MUDANÇA: Usamos document.getElementById para pegar os elementos da página.
        this.outputEl = document.getElementById('output');
        this.inputEl = document.getElementById('input');
        this.promptEl = document.getElementById('prompt');
        this.terminalContainer = document.getElementById('terminal-container');
        
        // Elementos da IDE
        this.editorView = document.getElementById('editor-view');
        this.editorTextarea = document.getElementById('editor-textarea');
        this.editorStatusbar = document.getElementById('editor-statusbar');
        
        // Estado
        this.isEditing = false;
        this.editingFile = { name: null, content: '' };
        this.matrixInterval = null;
        
        this.initVFS(); 
        this.updatePrompt();

        this.appendLine("PortalOS [Versão 3.1 - Stable]");
        this.appendLine("(c) Schneidolas Corporation. Todos os direitos reservados.");
        this.appendLine("Digite 'comandos' para ajuda.");
        this.appendLine("");

        // MUDANÇA: Os listeners são adicionados corretamente.
        this.inputEl.addEventListener('keydown', e => this.handleInput(e));
        this.editorTextarea.addEventListener('keydown', e => this.handleEditorKeys(e));
        
        this.inputEl.focus();
    }

    // --- SISTEMA DE ARQUIVOS VIRTUAL (VFS) ---
    initVFS() {
        this.vfs = {
            'C:': { type: 'dir', children: {
                    'Projetos': { type: 'dir', children: {
                        'ideia.txt': { type: 'file', content: 'Criar uma IDE para o meu terminal.' },
                        'startup.pos': { type: 'file', content: 'eco Iniciando sistema...\nwait 1000\neco Bem-vindo, Schneidolas!\n' }
                    }},
                    'Jogos': { type: 'dir', children: { }}
            }}
        };
        this.currentDirectory = ['C:'];
    }
    
    // --- LÓGICA DO PROMPT E NAVEGAÇÃO ---
    updatePrompt() { this.promptEl.textContent = `${this.currentDirectory.join('\\')}>`; }

    resolvePath(path) {
        let pathParts = path === '..' ? ['..'] : path.split(/[\\/]/).filter(p => p);
        let tempPath = [...this.currentDirectory];
        if (path.startsWith('C:')) { tempPath = ['C:']; pathParts.shift(); }
        for (const part of pathParts) {
            if (part === '..') { if (tempPath.length > 1) tempPath.pop(); } 
            else {
                const currentNode = this.getNodeFromPath(tempPath);
                if (currentNode?.type === 'dir' && currentNode.children[part]) { tempPath.push(part); } 
                else { return null; }
            }
        }
        return tempPath;
    }

    getNodeFromPath(pathArray) {
        let node = this.vfs['C:'];
        for (let i = 1; i < pathArray.length; i++) { node = node.children[pathArray[i]]; }
        return node;
    }

    // --- MANIPULAÇÃO DE ENTRADA ---
    handleInput(e) {
        // Para o matrix se qualquer tecla for pressionada
        if (this.matrixInterval) {
            clearInterval(this.matrixInterval);
            this.matrixInterval = null;
            this.outputEl.style.color = 'var(--foreground)';
            this.appendLine("\n...acordou.");
            this.inputEl.value = ''; // Limpa o input
            return;
        }
        
        if (e.key === 'Enter' && this.inputEl.value.trim() !== "") {
            const command = this.inputEl.value;
            this.appendLine(`${this.promptEl.textContent}${command}`);
            this.processCommand(command);
            this.inputEl.value = '';
            this.outputEl.scrollTop = this.outputEl.scrollHeight;
        }
    }

    appendLine(text) { 
        this.outputEl.innerHTML += text.replace(/</g, "<").replace(/>/g, ">") + '\n'; 
    }
    
    // --- PROCESSAMENTO DE COMANDOS ---
    async processCommand(cmd) {
        const [command, ...args] = cmd.trim().split(' ');
        const argStr = args.join(' ');
        const currentNode = this.getNodeFromPath(this.currentDirectory);

        // O switch continua o mesmo, com todos os seus comandos
        switch(command.toLowerCase()) {
            case 'comandos': case 'ajuda': case 'help':
                 const commandList = [
                    { name: 'comandos', desc: 'Exibe esta lista detalhada de comandos.' },
                    { name: 'ls / dir', desc: 'Lista arquivos e diretórios.' },
                    { name: 'cd [caminho]', desc: 'Muda de diretório. Use ".." para voltar.' },
                    { name: 'mkdir [nome]', desc: 'Cria um novo diretório.' },
                    { name: 'cat [arquivo]', desc: 'Exibe o conteúdo de um arquivo.' },
                    { name: 'touch [arquivo]', desc: 'Cria um arquivo vazio.' },
                    { name: 'tree', desc: 'Exibe a árvore de diretórios completa.' },
                    { name: 'edit [arquivo]', desc: 'Abre o editor de texto interno (IDE).' },
                    { name: 'run [url/arquivo]', desc: 'Executa um script .pos local ou de uma URL.'},
                    { name: 'ver', desc: 'Mostra a versão do PortalOS.' },
                    { name: 'data', desc: 'Exibe a data e hora atuais.' },
                    { name: 'limpar / cls', desc: 'Limpa a tela do terminal.' },
                    { name: 'eco [texto]', desc: 'Exibe o texto fornecido.' },
                    { name: 'matrix', desc: 'Entra na Matrix. Pressione qualquer tecla para sair.' }
                ];
                this.appendLine("==== LISTA DE COMANDOS DO PORTALOS ====");
                commandList.forEach(c => this.appendLine(`${c.name.padEnd(20, ' ')} - ${c.desc}`));
                this.appendLine("==========================================");
                break;
            case 'run':
                if (!argStr) { this.appendLine("Uso: run [url_do_script.pos] ou [arquivo_local.pos]"); break; }
                if (argStr.startsWith('http')) {
                    try {
                        this.appendLine(`Buscando script de ${argStr}...`);
                        const response = await fetch(argStr);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const scriptContent = await response.text();
                        this.appendLine(`Executando script externo...`);
                        await this.executeScript(scriptContent);
                    } catch (error) { this.appendLine(`Erro ao buscar ou executar script: ${error.message}`); }
                } else {
                    const file = currentNode.children[argStr];
                    if (file?.type === 'file') {
                        this.appendLine(`Executando script local '${argStr}'...`);
                        await this.executeScript(file.content);
                    } else { this.appendLine(`Arquivo de script local '${argStr}' não encontrado.`); }
                }
                this.appendLine("Execução do script concluída.");
                break;
            case 'tree':
                this.appendLine(this.currentDirectory[0]);
                const treeOutput = this.generateTree(this.vfs['C:'], '');
                treeOutput.forEach(line => this.appendLine(line));
                break;
            case 'matrix':
                this.outputEl.style.color = '#00FF00';
                this.matrixInterval = setInterval(() => {
                    this.appendLine(Array.from({length: 80}, () => Math.random() > 0.5 ? '1' : '0').join(''));
                    this.outputEl.scrollTop = this.outputEl.scrollHeight;
                }, 50);
                break;
            default: this.handleOtherCommands(command, argStr, currentNode);
        }
    },
    
    handleOtherCommands(command, argStr, currentNode) {
        switch(command.toLowerCase()) {
            case 'ls': case 'dir': Object.keys(currentNode.children).forEach(key => this.appendLine(currentNode.children[key].type === 'dir' ? `<DIR>   ${key}`: `        ${key}`)); break;
            case 'cd':
                if (!argStr) { this.appendLine(this.currentDirectory.join('\\')); break; }
                const newPathArray = this.resolvePath(argStr);
                const targetNode = newPathArray ? this.getNodeFromPath(newPathArray) : null;
                if (targetNode?.type === 'dir') { this.currentDirectory = newPathArray; this.updatePrompt(); } 
                else { this.appendLine(`O sistema não pode encontrar o caminho especificado.`); }
                break;
            case 'cat': case 'type':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr]?.type === 'file') { this.appendLine(currentNode.children[argStr].content); }
                else { this.appendLine(`O sistema não pode encontrar o arquivo especificado.`); }
                break;
            case 'mkdir':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr]) { this.appendLine(`Um subdiretório ou arquivo ${argStr} já existe.`); }
                else { currentNode.children[argStr] = { type: 'dir', children: {} }; }
                break;
            case 'touch':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (!currentNode.children[argStr]) { currentNode.children[argStr] = { type: 'file', content: '' }; }
                break;
            case 'edit':
                if (!argStr) { this.appendLine("Especifique um nome de arquivo para editar."); break; }
                const fileNode = currentNode.children[argStr];
                if (fileNode?.type === 'dir') { this.appendLine(`'${argStr}' é um diretório.`); }
                else { this.enterEditMode(argStr, fileNode ? fileNode.content : ''); }
                break;
            case 'limpar': case 'cls': this.outputEl.innerHTML = ''; break;
            case 'data': this.appendLine(new Date().toLocaleString('pt-BR')); break;
            case 'ver': this.appendLine("Versão do PortalOS: 3.1"); break;
            case 'eco': this.appendLine(argStr); break;
            default: this.appendLine(`Comando ou nome de arquivo '${command}' não reconhecido.`);
        }
    },
    
    // --- LÓGICA DA IDE ---
    enterEditMode(fileName, content) {
        this.isEditing = true;
        this.editingFile = { name: fileName, content: content };
        this.terminalContainer.style.display = 'none';
        this.editorView.style.display = 'flex';
        this.editorTextarea.value = content;
        this.editorStatusbar.textContent = `Editando: ${fileName} | Ctrl+S: Salvar | Ctrl+Q: Sair`;
        this.editorTextarea.focus();
    },
    exitEditMode(save = false) {
        if (save) {
            const currentNode = this.getNodeFromPath(this.currentDirectory);
            currentNode.children[this.editingFile.name] = { type: 'file', content: this.editorTextarea.value };
        }
        this.terminalContainer.style.display = 'flex';
        this.editorView.style.display = 'none';
        this.inputEl.focus();
        if(save) { this.appendLine(`Arquivo '${this.editingFile.name}' salvo.`); }
        this.isEditing = false;
    },
    handleEditorKeys(e) {
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); this.exitEditMode(true); } 
        else if (e.ctrlKey && e.key.toLowerCase() === 'q') { e.preventDefault(); this.exitEditMode(false); }
    },
    
    // --- NOVAS FUNÇÕES ---
    generateTree(node, prefix) {
        let result = [];
        const entries = Object.keys(node.children);
        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            result.push(`${prefix}${isLast ? '└── ' : '├── '}${entry}`);
            if (node.children[entry].type === 'dir') {
                result = result.concat(this.generateTree(node.children[entry], prefix + (isLast ? '    ' : '│   ')));
            }
        });
        return result;
    },
    
    async executeScript(scriptContent) {
        const lines = scriptContent.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
        for (const line of lines) {
            const [command, ...args] = line.trim().split(' ');
            if (command.toLowerCase() === 'wait') {
                const ms = parseInt(args[0]) || 1000;
                this.appendLine(`...aguardando ${ms}ms...`);
                await new Promise(resolve => setTimeout(resolve, ms));
            } else {
                this.appendLine(`> ${line}`);
                await this.processCommand(line);
            }
        }
    }
}

// Inicia o sistema
new PortalOS();

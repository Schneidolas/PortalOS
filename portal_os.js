// Objeto que representa o aplicativo de terminal (o seu "PortalOS")
const TerminalApp = {
    // Inicializa o estado do terminal
    init(windowBody) {
        this.body = windowBody;
        this.view = this.body.querySelector('.terminal-default-view');
        this.output = this.view.querySelector('.terminal-output');
        this.input = this.view.querySelector('.terminal-input');
        this.prompt = this.view.querySelector('.terminal-prompt');
        
        this.editorView = this.body.querySelector('.terminal-editor');
        this.editorTextarea = this.body.querySelector('.editor-textarea');
        this.editorStatusbar = this.body.querySelector('.editor-statusbar');
        
        this.isEditing = false;
        this.editingFile = { path: null, content: '' };
        this.matrixInterval = null;
        
        this.initVFS(); 
        this.updatePrompt();

        this.appendLine("PortalOS [Versão 3.0 - Developer Edition]");
        this.appendLine("(c) Schneidolas Corporation. Todos os direitos reservados.");
        this.appendLine("Digite 'comandos' para ajuda.");
        this.appendLine("");

        this.input.addEventListener('keydown', e => this.handleInput(e));
        this.editorTextarea.addEventListener('keydown', e => this.handleEditorKeys(e));
        
        this.input.focus();
    },

    // --- SISTEMA DE ARQUIVOS VIRTUAL (VFS) ---
    initVFS() {
        this.vfs = {
            'C:': {
                type: 'dir',
                children: {
                    'Projetos': {
                        type: 'dir',
                        children: {
                            'ideia.txt': { type: 'file', content: 'Criar uma IDE para o meu terminal.' },
                            'startup.pos': { type: 'file', content: 'eco Iniciando sistema...\nwait 1000\neco Bem-vindo, Schneidolas!\n' }
                        }
                    },
                    'Jogos': {
                        type: 'dir',
                        children: {
                            'PixelClicker.lnk': { type: 'file', content: 'launch:pixel-clicker' }
                        }
                    }
                }
            }
        };
        this.currentDirectory = ['C:'];
    },
    
    // --- LÓGICA DO PROMPT E NAVEGAÇÃO ---
    updatePrompt() { this.prompt.textContent = `${this.currentDirectory.join('\\')}>`; },

    resolvePath(path) {
        let pathParts = path === '..' ? ['..'] : path.split(/[\\/]/).filter(p => p);
        let tempPath = [...this.currentDirectory];
        if (path.startsWith('C:')) { tempPath = ['C:']; pathParts.shift(); }
        for (const part of pathParts) {
            if (part === '..') { if (tempPath.length > 1) tempPath.pop(); } 
            else {
                const currentNode = this.getNodeFromPath(tempPath);
                if (currentNode && currentNode.type === 'dir' && currentNode.children[part]) { tempPath.push(part); } 
                else { return null; }
            }
        }
        return tempPath;
    },

    getNodeFromPath(pathArray) {
        let node = this.vfs['C:'];
        for (let i = 1; i < pathArray.length; i++) { node = node.children[pathArray[i]]; }
        return node;
    },

    // --- MANIPULAÇÃO DE ENTRADA ---
    handleInput(e) {
        if (e.key === 'Enter' && this.input.value.trim() !== "") {
            const command = this.input.value;
            this.appendLine(`${this.prompt.textContent}${command}`);
            this.processCommand(command);
            this.input.value = '';
            this.output.scrollTop = this.output.scrollHeight;
        }
    },

    appendLine(text) { 
        if (this.output) { this.output.innerHTML += text.replace(/</g, "<").replace(/>/g, ">") + '\n'; }
    },
    
    // --- PROCESSAMENTO DE COMANDOS ---
    async processCommand(cmd) { // Agora é async para o `run`
        const [command, ...args] = cmd.trim().split(' ');
        const argStr = args.join(' ');
        const currentNode = this.getNodeFromPath(this.currentDirectory);

        switch(command.toLowerCase()) {
            case 'comandos':
            case 'ajuda':
            case 'help':
                const commandList = [
                    { name: 'comandos', desc: 'Exibe esta lista detalhada de comandos.' },
                    { name: 'ls / dir', desc: 'Lista arquivos e diretórios.' },
                    { name: 'cd [caminho]', desc: 'Muda de diretório. Use ".." para voltar.' },
                    { name: 'mkdir [nome]', desc: 'Cria um novo diretório.' },
                    { name: 'cat [arquivo]', desc: 'Exibe o conteúdo de um arquivo.' },
                    { name: 'touch [arquivo]', desc: 'Cria um arquivo vazio.' },
                    { name: 'tree', desc: 'Exibe a árvore de diretórios completa.' },
                    { name: 'edit [arquivo]', desc: 'Abre o editor de texto interno (IDE).' },
                    { name:g: 'run [url/arquivo]', desc: 'Executa um script .pos local ou de uma URL.'},
                    { name: 'launch [id]', desc: 'Abre um programa do ambiente gráfico.' },
                    { name: 'ping [host]', desc: 'Simula o envio de pacotes para um host.' },
                    { name: 'sysinfo/neofetch', desc: 'Mostra informações do sistema.' },
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
                    } catch (error) {
                        this.appendLine(`Erro ao buscar ou executar script: ${error.message}`);
                    }
                } else {
                    const file = currentNode.children[argStr];
                    if (file && file.type === 'file') {
                        this.appendLine(`Executando script local '${argStr}'...`);
                        await this.executeScript(file.content);
                    } else {
                        this.appendLine(`Arquivo de script local '${argStr}' não encontrado.`);
                    }
                }
                this.appendLine("Execução do script concluída.");
                break;
                
            case 'tree':
                this.appendLine(this.currentDirectory[0]);
                const treeOutput = this.generateTree(this.vfs['C:'], '');
                treeOutput.forEach(line => this.appendLine(line));
                break;

            case 'matrix':
                this.output.style.color = '#00FF00';
                const keydownHandler = () => {
                    clearInterval(this.matrixInterval);
                    this.output.style.color = '#c0c0c0';
                    document.removeEventListener('keydown', keydownHandler);
                    this.appendLine("...a Matrix te observando.");
                };
                document.addEventListener('keydown', keydownHandler);
                this.matrixInterval = setInterval(() => {
                    this.appendLine(Array.from({length: 50}, () => Math.random() > 0.5 ? '1' : '0').join(''));
                    this.output.scrollTop = this.output.scrollHeight;
                }, 100);
                break;
            // ... outros comandos ...
            default:
                // Reutilizando a lógica dos outros comandos
                const otherCommands = ['ls', 'dir', 'cd', 'cat', 'type', 'mkdir', 'touch', 'edit', 'limpar', 'cls', 'data', 'ver', 'eco', 'sysinfo', 'neofetch', 'launch', 'ping'];
                if (otherCommands.includes(command.toLowerCase())) {
                    this.handleOtherCommands(command.toLowerCase(), argStr, currentNode);
                } else {
                    this.appendLine(`Comando ou nome de arquivo '${command}' não reconhecido.`);
                }
        }
    },
    
    // Agrupa os comandos mais simples para manter o processador principal limpo
    handleOtherCommands(command, argStr, currentNode) {
        switch(command) {
            case 'ls': case 'dir': Object.keys(currentNode.children).forEach(key => this.appendLine(currentNode.children[key].type === 'dir' ? `<DIR>   ${key}`: `        ${key}`)); break;
            case 'cd':
                if (!argStr) { this.appendLine(this.currentDirectory.join('\\')); break; }
                const newPathArray = this.resolvePath(argStr);
                const targetNode = newPathArray ? this.getNodeFromPath(newPathArray) : null;
                if (targetNode && targetNode.type === 'dir') { this.currentDirectory = newPathArray; this.updatePrompt(); } 
                else { this.appendLine(`O sistema não pode encontrar o caminho especificado.`); }
                break;
            case 'cat': case 'type':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr] && currentNode.children[argStr].type === 'file') { this.appendLine(currentNode.children[argStr].content); }
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
                if (fileNode && fileNode.type === 'dir') { this.appendLine(`'${argStr}' é um diretório.`); }
                else { this.enterEditMode(argStr, fileNode ? fileNode.content : ''); }
                break;
            case 'limpar': case 'cls': this.output.innerHTML = ''; break;
            case 'data': this.appendLine(new Date().toLocaleString('pt-BR')); break;
            case 'ver': this.appendLine("Versão do PortalOS: 3.0"); break;
            case 'eco': this.appendLine(argStr); break;
            case 'sysinfo': this.appendLine("== Informações do Sistema ==\nOS: Web OS 95 (emulado)\nTerminal: PortalOS v3.0\nCPU: 1x JS Core @ V8 Engine\nMemória: Insuficiente"); break;
            case 'neofetch': this.appendLine("              _nnnn_\n             dGGGGMMb\n            @p~qp~~qMb\n            M|@||@) M|   guest@portalos\n            @,----.JM|   ------------\n            JS^`\\__/  ,qNb   OS: Web OS 95\n           dZP        qM|   Terminal: PortalOS\n           |`         ,p|   IDE: Habilitada\n           |           d'   VFS: Ativo\n           |          pP'   Resolução: "+window.innerWidth+"x"+window.innerHeight+"\n           |         p|\n           .d'        d'\n           d`,      ,'\n           \\`,    ,'\n            \\`;--'"); break;
            case 'launch':
                if(!argStr) { this.appendLine("Uso: launch <id_do_programa>"); break; }
                if (typeof WindowManager !== 'undefined') {
                    const appElement = document.querySelector(`[onclick*="'${argStr}'"]`);
                    if(appElement) appElement.click();
                    else this.appendLine(`Programa '${argStr}' não encontrado.`);
                } else { this.appendLine("Erro: Gerenciador de Janelas não encontrado."); }
                break;
            case 'ping':
                if(!argStr) { this.appendLine("Uso: ping <host>"); break; }
                this.appendLine(`Disparando para ${argStr}:`);
                let replies = 0;
                const pingInterval = setInterval(() => {
                    this.appendLine(`Resposta de ${argStr}: tempo=${Math.floor(Math.random() * 50 + 10)}ms`);
                    this.output.scrollTop = this.output.scrollHeight;
                    replies++;
                    if(replies >= 4) clearInterval(pingInterval);
                }, 700);
                break;
        }
    },
    
    // --- LÓGICA DA IDE ---
    enterEditMode(fileName, content) {
        this.isEditing = true;
        this.editingFile = { name: fileName, content: content };
        this.view.style.display = 'none';
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
        this.view.style.display = 'flex';
        this.editorView.style.display = 'none';
        this.input.focus();
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
            const connector = isLast ? '└── ' : '├── ';
            result.push(`${prefix}${connector}${entry}`);
            if (node.children[entry].type === 'dir') {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                result = result.concat(this.generateTree(node.children[entry], newPrefix));
            }
        });
        return result;
    },
    
    async executeScript(scriptContent) {
        const lines = scriptContent.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            const [command, ...args] = line.trim().split(' ');
            if (command.toLowerCase() === 'wait') {
                const ms = parseInt(args[0]) || 1000;
                this.appendLine(`...aguardando ${ms}ms...`);
                await new Promise(resolve => setTimeout(resolve, ms));
            } else {
                this.appendLine(`> ${line}`);
                this.processCommand(line);
            }
        }
    }
};

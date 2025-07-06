class PortalOS {
    constructor() {
        this.outputEl = document.getElementById('output');
        this.inputEl = document.getElementById('input');
        this.promptEl = document.getElementById('prompt');

        this.isMatrixRunning = false;
        this.matrixInterval = null;

        this.initVFS();
        this.updatePrompt();
        
        this.appendLine("PortalOS [Versão 4.0 - The Shell]");
        this.appendLine("(c) Schneidolas Corporation. Todos os direitos reservados.");
        this.appendLine("Digite 'comandos' para uma lista completa de funcionalidades.");
        this.appendLine("");

        this.inputEl.addEventListener('keydown', e => this.handleInput(e));
    }

    // --- SISTEMA DE ARQUIVOS VIRTUAL (VFS) ---
    initVFS() {
        this.vfs = {
            'C:': {
                type: 'dir',
                children: {
                    'docs': {
                        type: 'dir',
                        children: {
                            'ideia.txt': { type: 'file', content: 'Criar uma IDE para o meu terminal.' },
                            'readme.txt': { type: 'file', content: 'Bem-vindo ao sistema de arquivos do PortalOS!' }
                        }
                    },
                    'scripts': {
                        type: 'dir',
                        children: {
                           'exemplo.bat': { type: 'file', content: 'eco "Este é um script de exemplo!"\nver\ndata' }
                        }
                    }
                }
            }
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
            if (part === '..') {
                if (tempPath.length > 1) tempPath.pop();
            } else {
                const currentNode = this.getNodeFromPath(tempPath);
                if (currentNode && currentNode.type === 'dir' && currentNode.children[part]) {
                    tempPath.push(part);
                } else { return null; }
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
        if (this.isMatrixRunning) {
            e.preventDefault();
            this._stopMatrix();
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
    appendLine(text) { this.outputEl.innerHTML += text.replace(/</g, "<").replace(/>/g, ">") + '\n'; }
    
    // --- PROCESSAMENTO DE COMANDOS ---
    processCommand(cmd) {
        const [command, ...args] = cmd.trim().split(' ');
        const argStr = args.join(' ');
        const currentNode = this.getNodeFromPath(this.currentDirectory);

        switch(command.toLowerCase()) {
            case 'comandos':
            case 'ajuda':
            case 'help':
                const commandList = [
                    { name: 'comandos', desc: 'Exibe esta lista detalhada de comandos.' },
                    { name: 'ls / dir', desc: 'Lista arquivos e diretórios no local atual.' },
                    { name: 'cd [caminho]', desc: 'Muda para o diretório especificado. Use "cd .." para voltar.' },
                    { name: 'mkdir [nome]', desc: 'Cria um novo diretório.' },
                    { name: 'cat [arquivo]', desc: 'Exibe o conteúdo de um arquivo de texto.' },
                    { name: 'touch [arquivo]', desc: 'Cria um arquivo de texto vazio.' },
                    { name: 'tree', desc: 'Exibe a estrutura de diretórios de forma gráfica.' },
                    { name: 'load <url> [nome]', desc: 'Baixa um arquivo da web para o diretório atual.' },
                    { name: 'run <script.bat>', desc: 'Executa um arquivo de script de lote.' },
                    { name: 'sysinfo', desc: 'Mostra informações básicas do sistema.' },
                    { name: 'ver', desc: 'Mostra a versão do PortalOS.' },
                    { name: 'data', desc: 'Exibe a data e hora atuais.' },
                    { name: 'limpar / cls', desc: 'Limpa a tela do terminal.' },
                    { name: 'eco [texto]', desc: 'Exibe o texto fornecido.' },
                    { name: 'matrix', desc: 'Entra na Matrix. Pressione qualquer tecla para sair.' }
                ];
                this.appendLine("==== LISTA DE COMANDOS DO PORTALOS ====");
                commandList.forEach(c => this.appendLine(`${c.name.padEnd(18, ' ')} - ${c.desc}`));
                this.appendLine("==========================================");
                break;
            case 'ls':
            case 'dir':
                Object.keys(currentNode.children).forEach(key => {
                    if (currentNode.children[key].type === 'dir') { this.appendLine(`<DIR>   ${key}`); } 
                    else { this.appendLine(`        ${key}`); }
                });
                break;
            case 'cd':
                if (!argStr) { this.appendLine(this.currentDirectory.join('\\')); break; }
                const newPathArray = this.resolvePath(argStr);
                const targetNode = newPathArray ? this.getNodeFromPath(newPathArray) : null;
                if (targetNode && targetNode.type === 'dir') {
                    this.currentDirectory = newPathArray;
                    this.updatePrompt();
                } else { this.appendLine(`O sistema não pode encontrar o caminho especificado.`); }
                break;
            case 'cat':
            case 'type':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr] && currentNode.children[argStr].type === 'file') {
                    this.appendLine(currentNode.children[argStr].content);
                } else { this.appendLine(`O sistema não pode encontrar o arquivo especificado.`); }
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
            case 'limpar':
            case 'cls':
                 this.outputEl.innerHTML = ''; 
                 break;
            case 'data': this.appendLine(new Date().toLocaleString('pt-BR')); break;
            case 'ver': this.appendLine("Versão do PortalOS: 4.0 (The Shell)"); break;
            case 'eco': this.appendLine(args.join(' ')); break;
            case 'sysinfo': this.appendLine("== Informações do Sistema ==\nOS: PortalOS v4.0\nCPU: Emulado em JavaScript (V8)\nMemória: Alocada pelo Navegador"); break;
            case 'matrix':
                this.isMatrixRunning = true;
                this.outputEl.style.color = '#00FF00';
                this.matrixInterval = setInterval(() => {
                    this.appendLine(Array.from({length: Math.floor(window.innerWidth / 10)}, () => String.fromCharCode(Math.random() * (126 - 33) + 33)).join(''));
                    this.outputEl.scrollTop = this.outputEl.scrollHeight;
                }, 100);
                break;
            case 'tree':
                this.appendLine(this.currentDirectory[this.currentDirectory.length - 1]);
                this._buildTree(currentNode, "");
                break;
            case 'load':
                if (args.length < 1) { this.appendLine("Uso: load <url> [nome_do_arquivo]"); break; }
                const url = args[0];
                const fileName = args[1] || url.substring(url.lastIndexOf('/') + 1) || 'downloaded.txt';
                this.appendLine(`Baixando de ${url}...`);
                fetch(url).then(response => {
                    if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
                    return response.text();
                }).then(data => {
                    currentNode.children[fileName] = { type: 'file', content: data };
                    this.appendLine(`Arquivo '${fileName}' salvo com sucesso em ${this.currentDirectory.join('\\')}.`);
                }).catch(error => {
                    this.appendLine(`Erro ao baixar arquivo: ${error.message}`);
                });
                break;
            case 'run':
                if (!argStr) { this.appendLine("Uso: run <arquivo.bat>"); break; }
                if (currentNode.children[argStr] && currentNode.children[argStr].type === 'file') {
                    const scriptContent = currentNode.children[argStr].content;
                    const commandsToRun = scriptContent.split('\n').filter(line => line.trim() !== '');
                    this.appendLine(`Executando script '${argStr}'...`);
                    commandsToRun.forEach(line => {
                        this.appendLine(`${this.promptEl.textContent}${line}`);
                        this.processCommand(line);
                    });
                    this.appendLine(`...Fim do script '${argStr}'.`);
                } else { this.appendLine(`Script '${argStr}' não encontrado.`); }
                break;
            default: this.appendLine(`Comando ou nome de arquivo '${command}' não reconhecido.`);
        }
    },

    // --- FUNÇÕES AUXILIARES ---
    _stopMatrix() {
        clearInterval(this.matrixInterval);
        this.outputEl.style.color = 'var(--foreground)';
        this.isMatrixRunning = false;
        this.appendLine('\nMatrix desativada.');
    },

    _buildTree(node, prefix) {
        const entries = Object.keys(node.children);
        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            this.appendLine(`${prefix}${isLast ? '└── ' : '├── '}${entry}`);
            const childNode = node.children[entry];
            if (childNode.type === 'dir') {
                this._buildTree(childNode, prefix + (isLast ? '    ' : '│   '));
            }
        });
    }
}

// Inicia o sistema
new PortalOS();

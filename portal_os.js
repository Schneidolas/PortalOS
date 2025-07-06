class PortalOS {
    constructor() {
        this.outputEl = document.getElementById('output');
        this.inputEl = document.getElementById('input');
        this.promptEl = document.getElementById('prompt');

        this.initVFS();
        this.updatePrompt();
        
        this.appendLine("PortalOS [Versão 3.0 - Shell Puro]");
        this.appendLine("(c) Schneidolas Corporation. Todos os direitos reservados.");
        this.appendLine("Digite 'comandos' para ajuda.");
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
                    'games': {
                        type: 'dir',
                        children: {
                           'run.bat': {type: 'file', content: 'echo "Executando jogos..."'}
                        }
                    }
                }
            }
        };
        this.currentDirectory = ['C:'];
    }
    
    // --- LÓGICA DO PROMPT E NAVEGAÇÃO ---
    updatePrompt() {
        this.promptEl.textContent = `${this.currentDirectory.join('\\')}>`;
    }

    resolvePath(path) {
        let pathParts = path === '..' ? ['..'] : path.split(/[\\/]/).filter(p => p);
        let tempPath = [...this.currentDirectory];
        
        if (path.startsWith('C:')) {
            tempPath = ['C:'];
            pathParts.shift();
        }

        for (const part of pathParts) {
            if (part === '..') {
                if (tempPath.length > 1) tempPath.pop();
            } else {
                const currentNode = this.getNodeFromPath(tempPath);
                if (currentNode && currentNode.type === 'dir' && currentNode.children[part]) {
                    tempPath.push(part);
                } else {
                    return null;
                }
            }
        }
        return tempPath;
    }

    getNodeFromPath(pathArray) {
        let node = this.vfs['C:'];
        for (let i = 1; i < pathArray.length; i++) {
            node = node.children[pathArray[i]];
        }
        return node;
    }

    // --- MANIPULAÇÃO DE ENTRADA ---
    handleInput(e) {
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
    processCommand(cmd) {
        const [command, ...args] = cmd.trim().split(' ');
        const argStr = args.join(' ');
        const currentNode = this.getNodeFromPath(this.currentDirectory);

        switch(command.toLowerCase()) {
            case 'ajuda': 
            case 'help': 
            case 'comandos':
                const commandList = [
                    { name: 'ajuda/comandos', desc: 'Exibe a lista detalhada de comandos.' },
                    { name: 'ls / dir', desc: 'Lista arquivos e diretórios no local atual.' },
                    { name: 'cd [caminho]', desc: 'Muda para o diretório especificado. "cd .." volta um nível.' },
                    { name: 'mkdir [nome]', desc: 'Cria um novo diretório.' },
                    { name: 'cat [arquivo]', desc: 'Exibe o conteúdo de um arquivo de texto.' },
                    { name: 'touch [arquivo]', desc: 'Cria um arquivo de texto vazio.' },
                    // { name: 'edit [arquivo]', desc: 'Abre um arquivo no editor de texto (futuro).' }, // Comentado por agora
                    { name: 'sysinfo', desc: 'Mostra informações básicas do sistema.' },
                    { name: 'ver', desc: 'Mostra a versão do PortalOS.' },
                    { name: 'data', desc: 'Exibe a data e hora atuais.' },
                    { name: 'limpar / cls', desc: 'Limpa a tela do terminal.' },
                    { name: 'eco [texto]', desc: 'Exibe o texto fornecido.' }
                ];
                this.appendLine("==== LISTA DE COMANDOS DO PORTALOS ====");
                commandList.forEach(c => this.appendLine(`${c.name.padEnd(15, ' ')} - ${c.desc}`));
                this.appendLine("==========================================");
                break;
            case 'ls':
            case 'dir':
                Object.keys(currentNode.children).forEach(key => {
                    const item = currentNode.children[key];
                    if (item.type === 'dir') {
                        this.appendLine(`<DIR>   ${key}`);
                    } else {
                        this.appendLine(`        ${key}`);
                    }
                });
                break;
            case 'cd':
                if (!argStr) { this.appendLine(this.currentDirectory.join('\\')); break; }
                const newPathArray = this.resolvePath(argStr);
                const targetNode = newPathArray ? this.getNodeFromPath(newPathArray) : null;
                if (targetNode && targetNode.type === 'dir') {
                    this.currentDirectory = newPathArray;
                    this.updatePrompt();
                } else {
                    this.appendLine(`O sistema não pode encontrar o caminho especificado.`);
                }
                break;
            case 'cat':
            case 'type':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr] && currentNode.children[argStr].type === 'file') {
                    this.appendLine(currentNode.children[argStr].content);
                } else {
                    this.appendLine(`O sistema não pode encontrar o arquivo especificado.`);
                }
                break;
            case 'mkdir':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (currentNode.children[argStr]) {
                    this.appendLine(`Um subdiretório ou arquivo ${argStr} já existe.`);
                } else {
                    currentNode.children[argStr] = { type: 'dir', children: {} };
                }
                break;
            case 'touch':
                if (!argStr) { this.appendLine("Sintaxe incorreta."); break; }
                if (!currentNode.children[argStr]) {
                    currentNode.children[argStr] = { type: 'file', content: '' };
                }
                break;
            case 'limpar':
            case 'cls':
                 this.outputEl.innerHTML = ''; 
                 break;
            case 'data': this.appendLine(new Date().toLocaleString('pt-BR')); break;
            case 'ver': this.appendLine("Versão do PortalOS: 3.0 (Shell Puro)"); break;
            case 'eco': this.appendLine(args.join(' ')); break;
            case 'sysinfo': this.appendLine("== Informações do Sistema ==\nOS: PortalOS v3.0\nCPU: Emulado em JavaScript\nMemória: Alocada pelo Navegador"); break;
            
            default: this.appendLine(`Comando ou nome de arquivo '${command}' não reconhecido.`);
        }
    }
}

// Inicia o sistema
new PortalOS();

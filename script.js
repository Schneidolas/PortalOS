document.addEventListener('DOMContentLoaded', function() {
    const inputLine = document.getElementById('input-line');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');
    const promptElement = document.getElementById('prompt');
    const matrixScreen = document.getElementById('matrix-screen');
    let matrixInterval;

    // Simulação de um sistema de arquivos
    const fileSystem = {
        'C:': {
            type: 'directory',
            children: {
                'docs': {
                    type: 'directory',
                    children: {
                        'readme.txt': { type: 'file', content: 'Este é um arquivo de exemplo.' }
                    }
                },
                'programas': {
                    type: 'directory',
                    children: {
                        'pixel-clicker.exe': { type: 'program', content: 'Iniciando Pixel Clicker... (só uma simulação!)' }
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

    function getCurrentDirectory() {
        let dir = fileSystem['C:'];
        for (let i = 1; i < currentPath.length; i++) {
            dir = dir.children[currentPath[i]];
        }
        return dir;
    }
    
    function startMatrix() {
        terminal.style.display = 'none';
        matrixScreen.style.display = 'block';

        function matrixEffect() {
            let text = '';
            for (let i = 0; i < 2000; i++) { // Aumenta o número para preencher a tela
                text += Math.random() > 0.5 ? '1' : '0';
            }
            matrixScreen.textContent = text;
        }
        matrixInterval = setInterval(matrixEffect, 100);
        
        // Listener para parar a Matrix
        window.addEventListener('keydown', stopMatrix, { once: true });
        window.addEventListener('click', stopMatrix, { once: true });
    }

    function stopMatrix() {
        clearInterval(matrixInterval);
        terminal.style.display = 'flex'; // ou 'block' dependendo do seu layout
        matrixScreen.style.display = 'none';
        window.removeEventListener('keydown', stopMatrix);
        window.removeEventListener('click', stopMatrix);
        printOutput("...saindo da Matrix.");
        inputLine.focus();
    }


    const commands = {
        ajuda: () => printOutput(`==== AJUDA ====\nUse o comando "comandos" para ver a lista detalhada.`),
        comandos: () => printOutput(`==== LISTA DE COMANDOS DO PORTALOS ====
ajuda         - Exibe esta mensagem de ajuda.
comandos      - Exibe a lista detalhada de comandos.
ls / dir      - Lista arquivos e diretórios no local atual.
cd [caminho]  - Muda para o diretório especificado. "cd .." volta um nível.
mkdir [nome]  - Cria um novo diretório.
cat [arquivo] - Exibe o conteúdo de um arquivo de texto.
touch [arq]   - Cria um arquivo de texto vazio.
eco [texto]   - Exibe o texto fornecido.
launch [id]   - Abre um programa do sistema.
sysinfo       - Mostra informações básicas do sistema.
ver           - Mostra a versão do PortalOS.
data          - Exibe a data e hora atuais.
limpar        - Limpa a tela do terminal.
matrix        - Entra na Matrix.
`, true),
        limpar: () => output.innerHTML = '',
        data: () => printOutput(new Date().toLocaleString('pt-BR')),
        ver: () => printOutput('PortalOS [Versão 2.2 - User Friendly]'),
        sysinfo: () => printOutput(`Informações do Sistema:
  OS: PortalOS v2.2 (Web-based)
  CPU: Emulated JS Core
  RAM: (Depende do seu Navegador)
  Usuário: Guest`),
        eco: (args) => printOutput(args.join(' ')),
        dir: () => commands.ls(),
        ls: () => {
            const currentDir = getCurrentDirectory();
            let content = 'Conteúdo de ' + currentPath.join('\\') + ':\n\n';
            Object.keys(currentDir.children).forEach(key => {
                const item = currentDir.children[key];
                if (item.type === 'directory') {
                    content += `[DIR]    ${key}\n`;
                } else {
                    content += `         ${key}\n`;
                }
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
                if (currentPath.length > 1) {
                    currentPath.pop();
                }
            } else {
                const currentDir = getCurrentDirectory();
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
            const currentDir = getCurrentDirectory();
            if (currentDir.children[fileName] && currentDir.children[fileName].type === 'file') {
                printOutput(currentDir.children[fileName].content);
            } else {
                printOutput(`Arquivo não encontrado: ${fileName}`);
            }
        },
        mkdir: (args) => {
            const dirName = args[0];
            if (!dirName) {
                printOutput('Uso: mkdir [nome_do_diretorio]');
                return;
            }
            const currentDir = getCurrentDirectory();
            if (currentDir.children[dirName]) {
                printOutput(`Um subdiretório ou arquivo ${dirName} já existe.`);
            } else {
                currentDir.children[dirName] = { type: 'directory', children: {} };
                printOutput(`Diretório ${dirName} criado.`);
            }
        },
        touch: (args) => {
            const fileName = args[0];
            if (!fileName) {
                printOutput('Uso: touch [nome_do_arquivo]');
                return;
            }
            const currentDir = getCurrentDirectory();
            if (currentDir.children[fileName]) {
                printOutput(`Um arquivo ou diretório ${fileName} já existe.`);
            } else {
                currentDir.children[fileName] = { type: 'file', content: '' };
                printOutput(`Arquivo ${fileName} criado.`);
            }
        },
        launch: (args) => {
            const programName = args[0];
            const currentDir = getCurrentDirectory();
            if (currentDir.children[programName] && currentDir.children[programName].type === 'program') {
                printOutput(currentDir.children[programName].content);
            } else {
                printOutput(`Programa não encontrado: ${programName}`);
            }
        },
        matrix: () => {
            printOutput("Entrando na Matrix...");
            setTimeout(startMatrix, 500);
        }
    };
    
    // Header inicial
    printOutput("Microsoft(R) Windows NT(TM)");
    printOutput("(C) Copyright 1985-1996 Microsoft Corp.");
    printOutput('Digite "comandos" para uma lista de comandos customizados.');
    printOutput("");

    inputLine.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const fullCommand = inputLine.value;
            const parts = fullCommand.trim().split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            // Exibe o comando digitado no histórico
            printOutput(`${promptElement.textContent}${fullCommand}`);
            
            if (command in commands) {
                commands[command](args);
            } else if (command !== '') {
                printOutput(`'${command}' não é reconhecido como um comando interno ou externo, um programa operável ou um arquivo em lotes.`);
            }

            inputLine.value = '';
            terminal.scrollTop = terminal.scrollHeight;
        }
    });

    updatePrompt();
});

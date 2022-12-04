#!/usr/bin/env node

const os = require('os');
const readline = require('readline');
const { stdin: input, stdout: output } = require('process');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


let forceExit = false;
let backgroundProcesses = Object.create(null);

// Implemention of commands by making each command a function
let commandsList = {

    cat: function catCommand(input) {
        filename = input.toString().split(' ').at(1);
        try {
            fs.readFile(filename, (err, data) => {
                if (err) {
                    if (filename === ' ')
                        console.log(`cat: ${filename}: Is a directory`);
                }
                else {
                    process.stdout.write('\n' + data);
                    rl.prompt();
                }
            });
        } catch (err) {
            // let exception pass
            console.log('Invalid Argument');
        }
    },

    cd: function cdCommand(input) {
        var newDirectory = input.toString().split(' ').at(1);
        try {
            if (newDirectory === undefined || newDirectory === '') {
                process.chdir(os.homedir());
            } else {
                process.chdir(newDirectory);
            }
        } catch (e) {
            console.log(`cd: no such file or directory found: ${newDirectory}`);
        }
        var currentDirectory = process.cwd();
        rl.setPrompt(`\n(${os.userInfo().username}@${os.hostname()}) -[${currentDirectory}] \nN$: `);
    },

    clear: function clearCommand() {
        console.clear();
    },

    exit: function exitCommand() {
        if (!isProcessesEmpty() && !forceExit) {
            console.log(`\nThere are background processes`);
            exitCheck = true;
        } else {
            console.log('\nSee You Again!');
            rl.close();
            process.exit(1);
        }
    },

    fg: function fgCommand(input) {
        try {
            var fgPid = input.toString().split(' ').at(1);
            if (fgPid === undefined || backgroundProcesses[fgPid] === undefined || isNaN(parseInt(fgPid, 10))) {
                console.log('\nfg: no background process not found');
            }
            else {
                console.log(`got PID: ${fgPid}`);
                backgroundProcesses[fgPid].kill('SIGCONT');
            }
            exitCheck = false;
        } catch (error) {
            console.log(error);
        }
    },

    ls: function lsCommand(input) {
        try {
            dirToList = input.toString().split(' ').at(1);
            if (dirToList === undefined || dirToList === '') {
                dirToList = '.';
            }
            // Lists contents of directory with details in human readable format only for UNIX-based systems
            // const ls = spawnSync('ls', ['-lh', `${dirToList}`]).stdout.toString('utf8').split('\n');

            // Just lists contents of directory in Windows-based systems along with Unix-based systems
            const ls = fs.readdirSync(dirToList);

            ls.forEach(element => {
                if (!element.startsWith('.')) {
                    console.log(element);
                }
            });
        }
        catch (error) {
            console.log('Invalid argument');
        }
    },

    ps: function psCommand() {
        console.log();
        console.log('PID' + '       CMD')
        console.log();
        console.log(`${process.pid}` + `   ${process.argv[1]}`)

        for (const k of Object.keys(backgroundProcesses)) {
            console.log(k + `   ${backgroundProcesses[k].spawnargs}`);
        }
    },

    pwd: function pwdCommand() {
        console.log(process.cwd());
    }
};

// Optional: To clear screen as shell starts
console.clear();

// Changes the current working directory to home directory every time shell starts
process.chdir(os.homedir());

// Setting up user input mechanism
const rl = readline.createInterface({ input, output });

let promptMessage = `(${os.userInfo().username}@${os.hostname()}) -[${process.cwd()}] \nN$ `;
rl.setPrompt(promptMessage);
rl.prompt();

rl.on('line', (input) => {
    inputString = input.toString().replace('\t', ' ');
    var commandInput = inputString.split(' ').at(0);
    if (commandInput === '') {
        console.log();
        rl.prompt();
    } else if (commandInput in commandsList) {
        commandsList[commandInput](inputString);
        console.log();
        rl.prompt();
    } else if (commandInput.substring(0, 2) === './') {
        if (isFileExecutable(commandInput)) {
            try {
                executeBinaryFile(commandInput, inputString);
            } catch (error) {
                console.log(error);
                rl.prompt();
            }
        } else {
            console.log('Not executable');
            rl.prompt();
        }
    } else {
        console.log(`${commandInput}: command not found`);
        console.log();
        rl.prompt();
    }
});

// process.on('SIGTSTP', () => {
//     // Do nothing after recieving Ctrl+Z signal
// })

process.on('SIGINT', () => {
    commandsList['exit']();
});

// Utility Functions

// Check if background processes are running
function isProcessesEmpty() {
    for (var anyOneProcess in backgroundProcesses) {
        return false;
    }
    return true;
}

// Check if file is binary or executable or return an error
function isFileExecutable(filename) {
    try {
        fs.accessSync(filename, fs.constants.X_OK);
        return true;
    } catch (err) {
        return false;
    }
}

function executeBinaryFile(commandInput, inputString) {

    // path of executable file
    let binPath = path.resolve(commandInput);

    // Store arguments 
    let arguments = [];
    inputString.split(' ').forEach(element => {
        if (element != commandInput) {
            arguments.push(element);
        }
    });

    // Creating a child process using spawn and passing them arguments
    const execBin = spawn(`${binPath}`, arguments);
    backgroundProcesses[execBin.pid] = execBin;

    execBin.stdout.on('data', (data) => {
        console.log(`${data}`);
    });

    execBin.on('error', (msg) => {
        if (msg.message.toString().endsWith('ENOENT')) {
            console.log('node-shell: No such executable');
            delete (processes[execBin.pid]);
        }
        rl.prompt();
    });

    // For debugging the spawned child process
    execBin.stderr.on('data', (data) => {
        console.log(`ERRRRR... ${data}`);
    });

    execBin.on('exit', (code) => {
        console.log(`Program exited with code: ${code}.`);
        delete (backgroundProcesses[execBin.pid]);
        rl.prompt();
    });

    rl.on('SIGTSTP', () => {
        console.log(`suspended prcoess with PID: ${execBin.pid}`);
        execBin.kill('SIGTSTP');
        rl.prompt();
    });

    rl.on('SIGINT', () => {
        delete (backgroundProcesses[execBin.pid]);
        execBin.kill('SIGINT');
    });
}
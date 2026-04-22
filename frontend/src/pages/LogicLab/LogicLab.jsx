import React, { useState } from 'react';
import { Beaker, Play, RefreshCw, TerminalSquare } from 'lucide-react';
import Pageheader from '../../components/UI/Pageheader';

const LogicLab = () => {
  const [code, setCode] = useState('// Welcome to the Logic Lab!\n// Experiment with algorithms here without losing rank.\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(5));');
  const [output, setOutput] = useState('Output will appear here...');
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setOutput('Compiling and executing...');
    
    // Simulate code execution delay
    setTimeout(() => {
      try {
        // This is a basic simulation. In production, use a secure sandbox!
        // We capture console.log output for simulation.
        let logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));
        
        // Use Function instead of eval for slight safety, though still unsafe for real user input
        const execute = new Function(code);
        execute();
        
        console.log = originalLog;
        setOutput(logs.join('\n') || 'Execution complete. No output.');
      } catch (error) {
        setOutput(`Error: ${error.message}`);
      }
      setIsRunning(false);
    }, 800);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-100px)]">
      <Pageheader 
        title="Logic Lab" 
        description="A sandbox environment to test your code, build custom functions, and experiment."
        icon={Beaker}
      >
        <button 
          onClick={() => setCode('// Resetting sandbox...\n')}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px]"
        >
          <RefreshCw size={16} /> Reset
        </button>
      </Pageheader>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-gray-900 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-gray-800 border-b-2 border-black px-4 py-2 flex justify-between items-center text-white font-bold">
            <span className="flex items-center gap-2"><TerminalSquare size={18} /> sandbox.js</span>
            
            <button 
              onClick={handleRun}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-1 border-2 border-black font-black uppercase text-sm ${
                isRunning 
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-green-400 text-black hover:bg-green-300'
              }`}
            >
              <Play size={16} fill="currentColor" /> {isRunning ? 'Running...' : 'Run Code'}
            </button>
          </div>
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full bg-gray-900 text-green-400 font-mono p-4 focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>

        {/* Output Console */}
        <div className="w-full lg:w-96 flex flex-col bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-gray-800 border-b-2 border-black px-4 py-2 text-white font-bold uppercase text-sm">
            Console Output
          </div>
          <div className={`flex-1 p-4 font-mono whitespace-pre-wrap overflow-y-auto ${
            output.startsWith('Error') ? 'text-red-500' : 'text-white'
          }`}>
            {output}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicLab;

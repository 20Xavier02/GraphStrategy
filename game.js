class BipartiteMatchingGame {
   constructor() {
       this.canvas = document.getElementById('gameCanvas');
       this.ctx = this.canvas.getContext('2d');
       
       // Game state
       this.setASize = 2;
       this.setBSize = 3;
       this.nodeRadius = 20;
       this.nodes = { A: [], B: [] };
       this.edges = [];
       this.highlightedEdges = new Set();
       
       // Interaction states
       this.isDragging = false;
       this.draggedNode = null;
       this.isEditingWeight = false;
       this.editingEdge = null;
       this.lastTap = 0;
       this.lastEdgeClicked = null;
       
       // Add mobile detection
       this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
       
       // Adjust node radius for mobile
       if (this.isMobile) {
           this.nodeRadius = 15; // Smaller nodes on mobile
       }
       
       // Initialize game
       this.resizeCanvas();
       this.ph();
       
       // Create max score display
       const scoreDisplay = document.querySelector('.score-display');
       if (!document.getElementById('maxScore')) {
           const maxScoreDiv = document.createElement('div');
           maxScoreDiv.innerHTML = `Max Score: <span id="maxScore">?</span>`;
           scoreDisplay.appendChild(maxScoreDiv);
       }
       
       // Create win message element
       if (!document.getElementById('winMessage')) {
           const winMessageDiv = document.createElement('div');
           winMessageDiv.id = 'winMessage';
           winMessageDiv.style.display = 'none';
           scoreDisplay.appendChild(winMessageDiv);
       }
       
       // Event listeners
       window.addEventListener('resize', () => this.resizeCanvas());
       
       // Mouse events
       this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
       this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
       this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
       
       // Touch events
       this.canvas.addEventListener('touchstart', (e) => this.handleStart(e));
       this.canvas.addEventListener('touchmove', (e) => this.handleMove(e));
       this.canvas.addEventListener('touchend', (e) => this.handleEnd(e));
       this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e));
       
       // Global click/touch handler
       document.addEventListener('click', (e) => this.handleGlobalClick(e));
       document.addEventListener('touchend', (e) => this.handleGlobalClick(e));
       
       // Button handlers
       document.getElementById('toggleInstructions').addEventListener('click', () => this.toggleInstructions());
       document.getElementById('resetGraph').addEventListener('click', () => this.resetGraph());
       document.getElementById('checkMatching').addEventListener('click', () => this.checkMatching());
       document.getElementById('closeInstructions').addEventListener('click', () => {
           document.querySelector('.instructions-overlay').style.display = 'none';
           document.getElementById('gameCanvas').classList.remove('hidden');
           document.getElementById('toggleInstructions').textContent = 'Instructions';
       });
       
       // Size input handlers
       document.getElementById('setASize').addEventListener('change', (e) => this.handleSizeChange('A', e));
       document.getElementById('setBSize').addEventListener('change', (e) => this.handleSizeChange('B', e));
   }

    resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.draw();
    }
   
     initializeGraph() {
       const oldNodes = this.nodes;
       const oldEdges = this.edges;
       
       // Initialize new arrays while preserving existing nodes
       this.nodes = { 
           A: oldNodes ? [...oldNodes.A] : [], 
           B: oldNodes ? [...oldNodes.B] : [] 
       };
       this.edges = oldEdges ? [...oldEdges] : [];
       
       const padding = this.nodeRadius * 2;
       const allExistingNodes = [];
   
       // Helper function to get random position
       const getRandomPosition = () => {
           let x, y;
           let attempts = 0;
           const maxAttempts = 50;
   
           do {
               x = padding + Math.random() * (this.canvas.width - 2 * padding);
               y = padding + Math.random() * (this.canvas.height - 2 * padding);
               attempts++;
           } while (this.checkNodeOverlap(x, y, allExistingNodes) && attempts < maxAttempts);
   
           return { x, y };
       };
   
       // Adjust set A
       if (this.nodes.A.length > this.setASize) {
           // Remove excess nodes and their edges
           this.nodes.A.splice(this.setASize);
           this.edges = this.edges.filter(edge => edge.from.index < this.setASize);
       } else if (this.nodes.A.length < this.setASize) {
           // Add new nodes and edges
           for (let i = this.nodes.A.length; i < this.setASize; i++) {
               const pos = getRandomPosition();
               const newNode = {
                   x: pos.x,
                   y: pos.y,
                   label: `A${i + 1}`,
                   set: 'A'
               };
               this.nodes.A.push(newNode);
               allExistingNodes.push(newNode);
               
               // Add edges from this new node to all B nodes
               for (let j = 0; j < this.setBSize; j++) {
                   this.edges.push({
                       from: { set: 'A', index: i },
                       to: { set: 'B', index: j },
                       weight1: this.generateWeight() / 2,
                       weight2: this.generateWeight() / 2,
                       highlighted: false
                   });
               }
           }
       }
       
       // Adjust set B
       if (this.nodes.B.length > this.setBSize) {
           this.nodes.B.splice(this.setBSize);
           this.edges = this.edges.filter(edge => edge.to.index < this.setBSize);
       } else if (this.nodes.B.length < this.setBSize) {
           for (let j = this.nodes.B.length; j < this.setBSize; j++) {
               const pos = getRandomPosition();
               const newNode = {
                   x: pos.x,
                   y: pos.y,
                   label: `B${j + 1}`,
                   set: 'B'
               };
               this.nodes.B.push(newNode);
               allExistingNodes.push(newNode);
               
               // Add edges from all A nodes to this new node
               for (let i = 0; i < this.setASize; i++) {
                   const existingEdge = this.edges.find(e => 
                       e.from.index === i && e.to.index === j);
                   
                   if (!existingEdge) {
                       this.edges.push({
                           from: { set: 'A', index: i },
                           to: { set: 'B', index: j },
                           weight1: this.generateWeight() / 2,
                           weight2: this.generateWeight() / 2,
                           highlighted: false
                       });
                   }
               }
           }
       }
       
       // Clear highlighted edges that might be invalid now
       this.highlightedEdges = new Set(
           Array.from(this.highlightedEdges).filter(edgeIndex => {
               const edge = this.edges[edgeIndex];
               return edge && 
                      edge.from.index < this.setASize && 
                      edge.to.index < this.setBSize;
           })
       );
       
       this.updateScore();
       this.checkMatching(); // Update max score immediately
       this.draw();
   }
   checkNodeOverlap(x, y, existingNodes) {
       const minDistance = this.nodeRadius * 3; // Minimum distance between nodes
       for (const node of existingNodes) {
           const dx = node.x - x;
           const dy = node.y - y;
           const distance = Math.sqrt(dx * dx + dy * dy);
           if (distance < minDistance) {
               return true;
           }
       }
       return false;
   }
    generateWeight() {
    if (Math.random() < 0.375) {
        // 37.5% chance of weight being close to 0
        return Number((Math.random() * 0.2 - 0.1).toFixed(2));
    }
    // Generate weight between -0.9 and 0.9 to avoid rounding issues
    return Number((Math.random() * 1.8 - 0.9).toFixed(2));
}

    getEventPosition(e) {
       const rect = this.canvas.getBoundingClientRect();
       let clientX, clientY;
       
       if (e.touches && e.touches.length > 0) {
           clientX = e.touches[0].clientX;
           clientY = e.touches[0].clientY;
       } else {
           clientX = e.clientX;
           clientY = e.clientY;
       }
       
       return {
           x: (clientX - rect.left) * (this.canvas.width / rect.width),
           y: (clientY - rect.top) * (this.canvas.height / rect.height)
       };
   }
   findClickedEdgeWeight(pos) {
       for (let i = 0; i < this.edges.length; i++) {
           const edge = this.edges[i];
           const fromNode = this.nodes[edge.from.set][edge.from.index];
           const toNode = this.nodes[edge.to.set][edge.to.index];
           
           // Calculate midpoint of the edge
           const midX = (fromNode.x + toNode.x) / 2;
           const midY = (fromNode.y + toNode.y) / 2;
           
           // Check if click is near the midpoint (weight location)
           const dx = pos.x - midX;
           const dy = pos.y - midY;
           const distance = Math.sqrt(dx * dx + dy * dy);
           
           if (distance < 20) { // Adjust this value to change click sensitivity
               return i;
           }
       }
       return null;
   }
   findClickedNode(pos) {
       // Check set A nodes
       for (let i = 0; i < this.nodes.A.length; i++) {
           const node = this.nodes.A[i];
           const dx = node.x - pos.x;
           const dy = node.y - pos.y;
           if (dx * dx + dy * dy <= this.nodeRadius * this.nodeRadius) {
               return node;
           }
       }
       
       // Check set B nodes
       for (let i = 0; i < this.nodes.B.length; i++) {
           const node = this.nodes.B[i];
           const dx = node.x - pos.x;
           const dy = node.y - pos.y;
           if (dx * dx + dy * dy <= this.nodeRadius * this.nodeRadius) {
               return node;
           }
       }
       
       return null;
   }
    findNodeAtPosition(pos) {
        for (let i = 0; i < this.nodes.A.length; i++) {
            const node = this.nodes.A[i];
            if (Math.hypot(node.x - pos.x, node.y - pos.y) < this.nodeRadius) {
                return { set: 'A', index: i };
            }
        }
        for (let i = 0; i < this.nodes.B.length; i++) {
            const node = this.nodes.B[i];
            if (Math.hypot(node.x - pos.x, node.y - pos.y) < this.nodeRadius) {
                return { set: 'B', index: i };
            }
        }
        return null;
    }

    findEdgeAtPosition(pos) {
        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            const fromNode = this.nodes[edge.from.set][edge.from.index];
            const toNode = this.nodes[edge.to.set][edge.to.index];
            
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            if (Math.hypot(midX - pos.x, midY - pos.y) < 20) {
                return i;
            }
        }
        return -1;
    }
   
   handleStart(e) {
       e.preventDefault();
       const pos = this.getEventPosition(e);
       
       // First check for edge click
       const edgeIndex = this.findEdgeAtPosition(pos);
       if (edgeIndex !== -1) {
           if (this.canHighlightEdge(edgeIndex)) {
               this.toggleEdgeHighlight(edgeIndex);
           }
           return;
       }
       
       // Then check for weight edit
       const clickedEdge = this.findClickedEdgeWeight(pos);
       if (clickedEdge !== null) {
           this.startEdgeWeightEdit(clickedEdge, pos);
           return;
       }
       
       // Finally check for node drag
       const clickedNode = this.findClickedNode(pos);
       if (clickedNode) {
           this.isDragging = true;
           this.draggedNode = clickedNode;
           this.lastDragPos = pos;
       }
   }

    handleMove(e) {
       if (!this.isDragging || !this.draggedNode) return;
       e.preventDefault();
       
       const pos = this.getEventPosition(e);
       
       // Calculate new position with boundary constraints
       const newX = Math.min(Math.max(pos.x, this.nodeRadius), this.canvas.width - this.nodeRadius);
       const newY = Math.min(Math.max(pos.y, this.nodeRadius), this.canvas.height - this.nodeRadius);
       
       // Update node position with constrained values
       this.draggedNode.x = newX;
       this.draggedNode.y = newY;
       
       this.draw();
   }
    handleEnd(e) {
       if (e) e.preventDefault();
       this.isDragging = false;
       this.draggedNode = null;
       this.lastDragPos = null;
   }

    handleGlobalClick(e) {
        if (this.isEditingWeight && !e.target.classList.contains('weight-input')) {
            this.handleWeightInputComplete(document.querySelector('.weight-input'));
        }
    }

   startEdgeWeightEdit(edgeIndex, pos) {
       if (this.isEditingWeight) {
           return;
       }
   
       this.isEditingWeight = true;
       this.editingEdge = edgeIndex;
       
       const input = document.createElement('input');
       input.type = 'text';
       input.classList.add('weight-input');
       
       const edge = this.edges[edgeIndex];
       input.value = (edge.weight1 + edge.weight2).toFixed(2);
       
       const rect = this.canvas.getBoundingClientRect();
       input.style.position = 'absolute';
       input.style.left = `${pos.x + rect.left - 30}px`;
       input.style.top = `${pos.y + rect.top - 10}px`;
       
       // Handle all input events
       const completeEdit = () => {
           if (this.isEditingWeight) {
               this.handleWeightInputComplete(input);
           }
       };
   
       input.addEventListener('blur', completeEdit);
       input.addEventListener('keydown', (e) => {
           if (e.key === 'Enter') {
               completeEdit();
               e.preventDefault();
           }
       });
   
       // Prevent bubbling for touch events
       input.addEventListener('touchstart', (e) => e.stopPropagation());
       input.addEventListener('touchend', (e) => e.stopPropagation());
       input.addEventListener('touchmove', (e) => e.stopPropagation());
       input.addEventListener('mousedown', (e) => e.stopPropagation());
   
       document.body.appendChild(input);
       setTimeout(() => {
           input.focus();
           input.select();
       }, 50);
   }
   
   handleWeightInputComplete(input) {
       if (this.editingEdge !== null && input) {
           let value = parseFloat(input.value);
           
           // If invalid, generate random weight
           if (isNaN(value) || value < -1 || value > 1) {
               value = this.generateWeight();
           } else {
               value = Number(value.toFixed(2));
           }
           
           const edge = this.edges[this.editingEdge];
           edge.weight1 = value / 2;
           edge.weight2 = value / 2;
           
           this.updateScore();
       }
       
       // Remove input and reset state
       if (input && input.parentNode) {
           input.parentNode.removeChild(input);
       }
       this.isEditingWeight = false;
       this.editingEdge = null;
       this.draw();
   }


    removeWeightInput() {
        const input = document.querySelector('.weight-input');
        if (input) {
            input.remove();
        }
    }

    canHighlightEdge(edgeIndex) {
        const edge = this.edges[edgeIndex];
        if (edge.highlighted) {
            return true; // Can always unhighlight
        }

        if (this.highlightedEdges.size >= Math.min(this.setASize, this.setBSize)) {
            return false;
        }

        for (let highlightedEdgeIndex of this.highlightedEdges) {
            const highlightedEdge = this.edges[highlightedEdgeIndex];
            if (this.nodesOverlap(edge, highlightedEdge)) {
                return false;
            }
        }
        return true;
    }

    nodesOverlap(edge1, edge2) {
        return (
            (edge1.from.set === edge2.from.set && edge1.from.index === edge2.from.index) ||
            (edge1.to.set === edge2.to.set && edge1.to.index === edge2.to.index)
        );
    }
        toggleEdgeHighlight(edgeIndex) {
        if (this.edges[edgeIndex].highlighted) {
            this.edges[edgeIndex].highlighted = false;
            this.highlightedEdges.delete(edgeIndex);
        } else {
            this.edges[edgeIndex].highlighted = true;
            this.highlightedEdges.add(edgeIndex);
        }
        this.updateScore();
        this.draw();
    }

    updateScore() {
    let totalScore = 0;
    for (let edgeIndex of this.highlightedEdges) {
        const edge = this.edges[edgeIndex];
        // Make sure we're adding both weights and rounding at the end
        totalScore += (edge.weight1 + edge.weight2);
    }
    // Round to 2 decimal places at the end of calculation
    document.getElementById('currentScore').textContent = totalScore.toFixed(2);
}

findMaximumMatching() {
    // Create weight matrix for easier access
    const weights = Array(this.setASize).fill().map(() => Array(this.setBSize).fill(0));
    for (let i = 0; i < this.setASize; i++) {
        for (let j = 0; j < this.setBSize; j++) {
            const edge = this.edges[i * this.setBSize + j];
            weights[i][j] = edge.weight1 + edge.weight2;
        }
    }

    // Helper function to check if a matching is valid
    const isValidMatching = (matching) => {
        const usedA = new Set();
        const usedB = new Set();
        for (const [a, b] of matching) {
            if (usedA.has(a) || usedB.has(b)) return false;
            usedA.add(a);
            usedB.add(b);
        }
        return true;
    };

    // Helper function to get edge weight
    const getEdgeWeight = (a, b) => weights[a][b];

    let maxScore = -Infinity;
    const generateMatchings = (current, aIndex) => {
        if (aIndex === this.setASize) {
            if (isValidMatching(current)) {
                const score = current.reduce((sum, [a, b]) => 
                    sum + getEdgeWeight(a, b), 0);
                maxScore = Math.max(maxScore, score);
            }
            return;
        }

        // Try matching current A node with each B node
        for (let b = 0; b < this.setBSize; b++) {
            generateMatchings([...current, [aIndex, b]], aIndex + 1);
        }
        // Try not matching current A node
        generateMatchings(current, aIndex + 1);
    };

    generateMatchings([], 0);
    return maxScore === -Infinity ? 0 : maxScore;
}

checkMatching() {
    const maxScore = this.findMaximumMatching();
    const currentScore = Array.from(this.highlightedEdges)
        .reduce((sum, edgeIndex) => {
            const edge = this.edges[edgeIndex];
            return sum + (edge.weight1 + edge.weight2);
        }, 0);
    
    // Round both scores to 2 decimal places
    document.getElementById('maxScore').textContent = maxScore.toFixed(2);
    
    const winMessage = document.getElementById('winMessage');
    // Use a small epsilon for floating point comparison
    if (Math.abs(currentScore - maxScore) < 0.01) {
        winMessage.textContent = "You win! This is the best matching available.";
        winMessage.style.display = 'block';
    } else {
        winMessage.style.display = 'none';
    }
}
    hungarianAlgorithm(weights) {
       const n = weights.length;
       const lx = Array(n).fill(0);
       const ly = Array(n).fill(0);
       const match = Array(n).fill(-1);
       
       // Initialize lx with maximum weights from each row
       for (let i = 0; i < n; i++) {
           lx[i] = Math.max(...weights[i]);
       }
       
       for (let k = 0; k < n; k++) {
           let p = Array(n).fill(-1);
           let used = Array(n).fill(false);
           
           let j1 = 0;
           while (j1 < n) {
               if (match[j1] === -1) break;
               j1++;
           }
           if (j1 >= n) continue;
           
           let queue = [j1];
           used[j1] = true;
           let j2;
           
           do {
               j2 = -1;
               j1 = queue[queue.length - 1];
               let delta = Infinity;
               
               for (let j = 0; j < n; j++) {
                   if (!used[j]) {
                       let cur = lx[k] + ly[j] - weights[k][j];
                       if (cur < delta) {
                           delta = cur;
                           j2 = j;
                       }
                   }
               }
               
               if (j2 !== -1) {
                   if (delta > 0) {
                       for (let j = 0; j < n; j++) {
                           if (used[j]) ly[j] -= delta;
                       }
                       lx[k] += delta;
                   }
                   queue.push(j2);
                   used[j2] = true;
                   p[j2] = j1;
               }
           } while (j2 !== -1 && match[j2] === -1);
           
           if (j2 !== -1) {
               let cur = j2;
               while (cur !== -1) {
                   let prev = p[cur];
                   let next = match[prev];
                   match[cur] = k;
                   cur = next;
               }
           }
       }
       
       let maxScore = 0;
       for (let j = 0; j < n; j++) {
           if (match[j] !== -1 && match[j] < this.setASize && j < this.setBSize) {
               maxScore += weights[match[j]][j];
           }
       }
       return maxScore;
   }

    resetGraph() {
    // Clear existing state
    this.nodes = { A: [], B: [] };
    this.edges = [];
    this.highlightedEdges = new Set();
    
    // Initialize new graph with random positions
    this.initializeGraph();
    
    // Reset scores and messages
    document.getElementById('currentScore').textContent = '0.00';
    this.checkMatching(); // Update max score immediately
    document.getElementById('winMessage').style.display = 'none';
    this.draw();
}
    handleSizeChange(set, e) {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 10) {
        if (set === 'A') {
            this.setASize = value;
        } else {
            this.setBSize = value;
        }
        this.initializeGraph();
        this.checkMatching(); // Update max score immediately
        document.getElementById('winMessage').style.display = 'none';
    }
}
    toggleInstructions() {
        const instructionsOverlay = document.querySelector(".instructions-overlay");
        const gameCanvas = document.getElementById("gameCanvas");
        const toggleButton = document.getElementById("toggleInstructions");

        if (instructionsOverlay.style.display === "none" || instructionsOverlay.style.display === "") {
            instructionsOverlay.style.display = "flex";
            gameCanvas.classList.add("hidden");
            toggleButton.textContent = "Resume Game";
        } else {
            instructionsOverlay.style.display = "none";
            gameCanvas.classList.remove("hidden");
            toggleButton.textContent = "Instructions";
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges
        this.edges.forEach((edge, index) => {
            const fromNode = this.nodes[edge.from.set][edge.from.index];
            const toNode = this.nodes[edge.to.set][edge.to.index];
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.strokeStyle = edge.highlighted ? '#000' : '#666';
            this.ctx.lineWidth = edge.highlighted ? 3 : 1;
            this.ctx.stroke();

            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            this.ctx.save();
            this.ctx.translate(midX, midY);
            
            let angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }
            
            this.ctx.rotate(angle);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = edge.highlighted ? '#000' : '#666';
            this.ctx.font = edge.highlighted ? 'bold 14px Arial' : '14px Arial';
            
            const totalWeight = (edge.weight1 + edge.weight2).toFixed(2);
            this.ctx.fillText(totalWeight, 0, -10);
            
            this.ctx.restore();
        });

        // Draw nodes
        for (const set of ['A', 'B']) {
            this.nodes[set].forEach((node, index) => {
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = set === 'A' ? '#f44336' : '#2196F3';
                this.ctx.fill();
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(node.label, node.x, node.y);
            });
        }
    }
}

// Initialize game when window loads
window.addEventListener('load', () => {
    new BipartiteMatchingGame();
});

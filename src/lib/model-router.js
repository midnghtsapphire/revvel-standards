const fs = require('fs');
const path = require('path');

const enterpriseMatrixPath = path.join(__dirname, '../../config/enterprise-model-matrix.json');
const domainMatrixPath = path.join(__dirname, '../../config/domain-expertise-matrix.json');

function loadMatrix(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Failed to load matrix from ${filePath}:`, error);
        return null;
    }
}

const enterpriseMatrix = loadMatrix(enterpriseMatrixPath);
const domainMatrix = loadMatrix(domainMatrixPath);

function getModelById(modelId) {
    if (!enterpriseMatrix || !enterpriseMatrix.models) return null;
    return enterpriseMatrix.models.find(model => model.id === modelId);
}

function getBestModelsForDomain(domainName) {
    if (!domainMatrix || !domainMatrix.domains) return [];

    const domain = domainMatrix.domains.find(d => d.name.toLowerCase() === domainName.toLowerCase());
    if (!domain) return [];

    return domain.best_models.map(getModelById).filter(model => model && model.enabled);
}

function getFallbackChain() {
     // 1. Perplexity no-key
     // 2. OpenRouter models
     // 3. Ollama (local)

     if (!enterpriseMatrix || !enterpriseMatrix.models) return [];

     const chain = [];

     // 1. Perplexity
     const perplexityModel = enterpriseMatrix.models.find(m => m.provider === 'perplexity' && m.enabled);
     if (perplexityModel) {
         chain.push({
             type: 'no-key-perplexity',
             model: perplexityModel
         });
     }

     // 2. OpenRouter (top general models)
     const openRouterModels = enterpriseMatrix.models.filter(m =>
         ['anthropic', 'openai', 'deepseek', 'google'].includes(m.provider) && m.enabled
     );

     openRouterModels.forEach(model => {
          chain.push({
              type: 'openrouter',
              model: model
          });
     });

     // 3. Ollama
     const ollamaModel = enterpriseMatrix.models.find(m => m.provider === 'ollama' && m.enabled);
     if (ollamaModel) {
         chain.push({
             type: 'ollama',
             model: ollamaModel
         });
     }

     return chain;
}

module.exports = {
    getBestModelsForDomain,
    getFallbackChain,
    enterpriseMatrix,
    domainMatrix
};

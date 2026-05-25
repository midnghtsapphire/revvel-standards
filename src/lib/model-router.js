const fs = require('fs');
const path = require('path');

const enterpriseMatrixPath = path.join(__dirname, '../../config/enterprise-matrix.json');
const enterpriseModelMatrixPath = path.join(__dirname, '../../config/enterprise-model-matrix.json');
const domainMatrixPath = path.join(__dirname, '../../config/domain-expertise-matrix.json');

let enterpriseMatrixCache;
let domainMatrixCache;

function loadMatrix(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load matrix from ${filePath}:`, error);
    return null;
  }
}

function getEnterpriseMatrix() {
  if (enterpriseMatrixCache !== undefined) {
    return enterpriseMatrixCache;
  }

  const enterpriseMatrix = loadMatrix(enterpriseMatrixPath) || {};
  const enterpriseModelMatrix = loadMatrix(enterpriseModelMatrixPath) || {};

  enterpriseMatrixCache = {
    ...enterpriseMatrix,
    models: Array.isArray(enterpriseMatrix.models)
      ? enterpriseMatrix.models
      : (Array.isArray(enterpriseModelMatrix.models) ? enterpriseModelMatrix.models : []),
  };

  return enterpriseMatrixCache;
}

function getDomainMatrix() {
  if (domainMatrixCache !== undefined) {
    return domainMatrixCache;
  }
  domainMatrixCache = loadMatrix(domainMatrixPath);
  return domainMatrixCache;
}

function inferModeFromProvider(provider) {
  if (provider === 'perplexity') return 'no-key';
  if (provider === 'ollama') return 'ollama';
  return 'openrouter';
}

function getModelById(modelId) {
  const enterpriseMatrix = getEnterpriseMatrix();
  if (!enterpriseMatrix || !Array.isArray(enterpriseMatrix.models)) return null;
  return enterpriseMatrix.models.find((model) => model.id === modelId);
}

function getBestModelsForDomain(domainName) {
  const domainMatrix = getDomainMatrix();
  if (!domainMatrix || !Array.isArray(domainMatrix.domains)) return [];

  const domain = domainMatrix.domains.find(
    (d) => d.name.toLowerCase() === domainName.toLowerCase()
  );
  if (!domain) return [];

  return domain.best_models.map(getModelById).filter((model) => model && model.enabled);
}

function getFallbackChain() {
  const enterpriseMatrix = getEnterpriseMatrix();
  if (!enterpriseMatrix || !Array.isArray(enterpriseMatrix.models)) return [];

  const enabledModels = enterpriseMatrix.models.filter((m) => m.enabled);
  const chain = [];
  const buckets = ['no-key', 'openrouter', 'ollama'];

  for (const bucket of buckets) {
    enabledModels
      .filter((model) => (model.mode || inferModeFromProvider(model.provider)) === bucket)
      .forEach((model) => {
        chain.push({
          type: bucket === 'no-key' ? 'no-key-perplexity' : bucket,
          model,
        });
      });
  }

  return chain;
}

module.exports = {
  getBestModelsForDomain,
  getFallbackChain,
  getEnterpriseMatrix,
  getDomainMatrix,
  get enterpriseMatrix() {
    return getEnterpriseMatrix();
  },
  get domainMatrix() {
    return getDomainMatrix();
  },
};

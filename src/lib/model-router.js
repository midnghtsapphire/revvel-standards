const fs = require('fs');
const path = require('path');
const { MODE_ORDER } = require('./model-routing-modes');

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

  const architectureMatrix = loadMatrix(enterpriseMatrixPath) || {};
  const modelCatalog = loadMatrix(enterpriseModelMatrixPath) || {};

  enterpriseMatrixCache = {
    ...architectureMatrix,
    models: Array.isArray(modelCatalog.models) ? modelCatalog.models : [],
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

  const invalidModeModels = enterpriseMatrix.models.filter(
    (m) => m.enabled && (typeof m.mode !== 'string' || !MODE_ORDER.includes(m.mode))
  );
  if (invalidModeModels.length > 0) {
    console.warn(
      `Ignoring enabled models with invalid mode: ${invalidModeModels.map((model) => `${model.provider}/${model.name} (${model.mode || 'missing'})`).join(', ')}`
    );
  }

  const enabledModels = enterpriseMatrix.models.filter(
    (m) => m.enabled && typeof m.mode === 'string' && MODE_ORDER.includes(m.mode)
  );
  const chain = [];

  for (const bucket of MODE_ORDER) {
    enabledModels
      .filter((model) => model.mode === bucket)
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

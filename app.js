// Banco de dados local
let db = JSON.parse(localStorage.getItem('sysDb')) || {
    produtos: [],
    saidas: [],
    vendas: []
};

// Função para salvar no LocalStorage
function saveDb() {
    localStorage.setItem('sysDb', JSON.stringify(db));
    updateUI();
}

// Navegação de Abas
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    updateUI();
}

// --- CADASTRO DE PRODUTO ---
document.getElementById('form-produto').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('prod-nome').value;
    const qtd = parseInt(document.getElementById('prod-qtd').value);
    const preco = parseFloat(document.getElementById('prod-preco').value);

    db.produtos.push({ id: Date.now(), nome, qtdEstoque: qtd, preco });
    saveDb();
    this.reset();
});

// --- REGISTRO DE SAÍDA (RUA) ---
document.getElementById('form-saida').addEventListener('submit', function(e) {
    e.preventDefault();
    const prodId = parseInt(document.getElementById('saida-produto').value);
    const qtd = parseInt(document.getElementById('saida-qtd').value);
    const func = document.getElementById('saida-func').value;

    let produto = db.produtos.find(p => p.id === prodId);
    if(produto.qtdEstoque < qtd) return alert('Estoque insuficiente!');

    produto.qtdEstoque -= qtd; // Deduz do estoque
    db.saidas.push({ 
        id: Date.now(), 
        prodId, 
        nomeProd: produto.nome, 
        func, 
        qtdInicial: qtd, 
        qtdRestanteNaRua: qtd,
        precoUnitario: produto.preco,
        data: new Date().toLocaleDateString() 
    });
    saveDb();
    this.reset();
});

// --- REGISTRO DE VENDA ---
document.getElementById('form-venda').addEventListener('submit', function(e) {
    e.preventDefault();
    const saidaId = parseInt(document.getElementById('venda-saida').value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    const status = document.getElementById('venda-status').value;

    let saida = db.saidas.find(s => s.id === saidaId);
    if(saida.qtdRestanteNaRua < qtd) return alert('Quantidade maior do que a que o funcionário tem na rua!');

    saida.qtdRestanteNaRua -= qtd;
    const total = qtd * saida.precoUnitario;

    db.vendas.push({ id: Date.now(), func: saida.func, cliente, produto: saida.nomeProd, qtd, total, status });
    saveDb();
    this.reset();
});

// --- ATUALIZAÇÃO DA INTERFACE ---
function updateUI() {
    renderSelects();
    renderTables();
    renderDashboard();
}

function renderSelects() {
    // Select de Produtos na aba Saídas
    const selProd = document.getElementById('saida-produto');
    selProd.innerHTML = '<option value="">Selecione o Produto...</option>';
    db.produtos.forEach(p => {
        selProd.innerHTML += `<option value="${p.id}">${p.nome} (Disp: ${p.qtdEstoque})</option>`;
    });

    // Select de Lotes na Rua na aba Vendas
    const selVenda = document.getElementById('venda-saida');
    selVenda.innerHTML = '<option value="">Selecione o Lote na Rua...</option>';
    db.saidas.filter(s => s.qtdRestanteNaRua > 0).forEach(s => {
        selVenda.innerHTML += `<option value="${s.id}">${s.func} - ${s.nomeProd} (Com ele: ${s.qtdRestanteNaRua})</option>`;
    });
}

function renderTables() {
    // Tabela Produtos
    const tbProd = document.querySelector('#table-produtos tbody');
    tbProd.innerHTML = '';
    db.produtos.forEach(p => {
        tbProd.innerHTML += `<tr><td>${p.nome}</td><td>${p.qtdEstoque}</td><td>R$ ${p.preco.toFixed(2)}</td></tr>`;
    });

    // Tabela Saídas
    const tbSaidas = document.querySelector('#table-saidas tbody');
    tbSaidas.innerHTML = '';
    db.saidas.forEach(s => {
        tbSaidas.innerHTML += `<tr><td>${s.data}</td><td>${s.func}</td><td>${s.nomeProd}</td><td>${s.qtdInicial}</td></tr>`;
    });

    // Tabela Vendas
    const tbVendas = document.querySelector('#table-vendas tbody');
    tbVendas.innerHTML = '';
    db.vendas.forEach(v => {
        const cls = v.status === 'Pago' ? 'status-pago' : 'status-pendente';
        tbVendas.innerHTML += `<tr><td>${v.func}</td><td>${v.cliente}</td><td>${v.produto}</td><td>${v.qtd}</td><td>R$ ${v.total.toFixed(2)}</td><td class="${cls}">${v.status}</td></tr>`;
    });
}

function renderDashboard() {
    let totEstoque = db.produtos.reduce((acc, p) => acc + p.qtdEstoque, 0);
    let totRua = db.saidas.reduce((acc, s) => acc + s.qtdRestanteNaRua, 0);
    let totVendasQtd = db.vendas.reduce((acc, v) => acc + v.qtd, 0);
    let receitaPaga = db.vendas.filter(v => v.status === 'Pago').reduce((acc, v) => acc + v.total, 0);

    document.getElementById('dash-estoque').innerText = totEstoque;
    document.getElementById('dash-rua').innerText = totRua;
    document.getElementById('dash-vendas').innerText = totVendasQtd;
    document.getElementById('dash-receita').innerText = `R$ ${receitaPaga.toFixed(2)}`;

    // Tabela Dash Rua
    const tbDashRua = document.querySelector('#table-dash-rua tbody');
    tbDashRua.innerHTML = '';
    db.saidas.filter(s => s.qtdRestanteNaRua > 0).forEach(s => {
        tbDashRua.innerHTML += `<tr><td>${s.func}</td><td>${s.nomeProd}</td><td>${s.qtdRestanteNaRua}</td></tr>`;
    });
}

// Iniciar
updateUI();

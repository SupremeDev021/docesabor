// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE (Corrigida)
// ==========================================
// ATENÇÃO: A URL não pode ter "/rest/v1/" no final. Foi corrigido abaixo.
const SUPABASE_URL = "https://kfnvhqspzefdvfkgbawp.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnZocXNwemVmZHZma2diYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjE3MTcsImV4cCI6MjA5NTU5NzcxN30.JOWCOAszK1W3GOklrwhKUAy_lGbuX7WGmlwAdsIvBj8";

// Mudamos o nome da variável para "meuBanco" para nunca mais dar o erro de "already been declared"
var meuBanco = null;

try {
    if (window.supabase) {
        meuBanco = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (erro) {
    console.error("Erro ao iniciar o banco de dados:", erro);
}

// ==========================================
// 2. NAVEGAÇÃO DE ABAS 
// ==========================================
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    
    if (typeof fetchData === 'function') {
        fetchData();
    }
};

// ==========================================
// 3. LÓGICA DA CALCULADORA INTELIGENTE
// ==========================================
var insumos = []; 

window.adicionarInsumo = function() {
    const nomeInput = document.getElementById('insumo-nome');
    const valorInput = document.getElementById('insumo-valor');
    const nome = nomeInput.value.trim() || 'Item sem nome';
    const valor = parseFloat(valorInput.value);

    if (isNaN(valor) || valor <= 0) return alert('Insira um valor válido para o item!');

    insumos.push({ id: Date.now(), nome, valor });
    
    nomeInput.value = '';
    valorInput.value = '';
    
    atualizarListaInsumos();
};

window.removerInsumo = function(id) {
    insumos = insumos.filter(item => item.id !== id);
    atualizarListaInsumos();
};

function atualizarListaInsumos() {
    const lista = document.getElementById('lista-insumos');
    lista.innerHTML = '';
    
    let custoTotal = 0;
    
    insumos.forEach(item => {
        custoTotal += item.valor;
        lista.innerHTML += `
            <li>
                <span>${item.nome}</span>
                <span>R$ ${item.valor.toFixed(2)} <span class="btn-remover" onclick="removerInsumo(${item.id})">X</span></span>
            </li>
        `;
    });

    document.getElementById('calc-custo').value = custoTotal.toFixed(2);
    window.calcularPreco(); 
}

window.calcularPreco = function() {
    // 1. Pega os valores da tela
    const custoTotal = parseFloat(document.getElementById('calc-custo').value) || 0;
    const rendimento = parseInt(document.getElementById('calc-rendimento').value) || 1;
    const margem = parseFloat(document.getElementById('calc-margem').value) || 0;
    
    // 2. Impede divisão por zero se o usuário apagar o campo
    const qtdValida = rendimento > 0 ? rendimento : 1;

    // 3. Descobre o custo de apenas 1 unidade
    const custoUnitario = custoTotal / qtdValida;
    
    // 4. Aplica a margem de lucro em cima da unidade
    const precoSugerido = custoUnitario + (custoUnitario * (margem / 100));
    
    // 5. Mostra na tela
    document.getElementById('calc-resultado').innerText = `R$ ${precoSugerido.toFixed(2)}`;
};

// ==========================================
// 4. FLUXOS DO BANCO DE DADOS (SUPABASE)
// ==========================================

async function fetchData() {
    if (!meuBanco) return; 
    await renderSelects();
    await renderTables();
    await renderDashboard();
}

// Cadastrar Funcionário
document.getElementById('form-funcionario').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) return alert("Banco de dados não conectado.");
    const nome = document.getElementById('func-nome').value;
    
    await meuBanco.from('funcionarios').insert([{ nome }]);
    this.reset();
    fetchData();
});

// Cadastrar Produto
document.getElementById('form-produto').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) return alert("Banco de dados não conectado.");
    const nome = document.getElementById('prod-nome').value;
    const qtd_estoque = parseInt(document.getElementById('prod-qtd').value);
    const custo_producao = parseFloat(document.getElementById('prod-custo').value);
    const preco_venda = parseFloat(document.getElementById('prod-preco').value);

    await meuBanco.from('produtos').insert([{ nome, qtd_estoque, custo_producao, preco_venda }]);
    this.reset();
    fetchData();
});

// Registrar Saída para a Rua
document.getElementById('form-saida').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) return alert("Banco de dados não conectado.");
    const produto_id = parseInt(document.getElementById('saida-produto').value);
    const funcionario_id = parseInt(document.getElementById('saida-func').value);
    const qtd = parseInt(document.getElementById('saida-qtd').value);

    let { data: prod } = await meuBanco.from('produtos').select('qtd_estoque').eq('id', produto_id).single();
    if (prod.qtd_estoque < qtd) return alert('Estoque interno insuficiente!');

    await meuBanco.from('produtos').update({ qtd_estoque: prod.qtd_estoque - qtd }).eq('id', produto_id);
    await meuBanco.from('saidas').insert([{ produto_id, funcionario_id, qtd_inicial: qtd, qtd_restante: qtd }]);
    
    this.reset();
    fetchData();
});

// Registrar Venda
document.getElementById('form-venda').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) return alert("Banco de dados não conectado.");
    const saida_id = parseInt(document.getElementById('venda-saida').value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    const status = document.getElementById('venda-status').value;

    let { data: saida } = await meuBanco.from('saidas').select('*, produtos(preco_venda)').eq('id', saida_id).single();
    if (saida.qtd_restante < qtd) return alert('O funcionário não tem essa quantidade na rua!');

    const total = qtd * saida.produtos.preco_venda;

    await meuBanco.from('saidas').update({ qtd_restante: saida.qtd_restante - qtd }).eq('id', saida_id);
    await meuBanco.from('vendas').insert([{ saida_id, qtd, cliente, total, status }]);

    this.reset();
    fetchData();
});

// Dar Baixa
window.darBaixa = async function(vendaId) {
    if(!meuBanco) return;
    await meuBanco.from('vendas').update({ status: 'Pago' }).eq('id', vendaId);
    fetchData();
};


// ==========================================
// 5. ATUALIZAÇÃO VISUAL (Tabelas e Dashboard)
// ==========================================

async function renderSelects() {
    const { data: prods } = await meuBanco.from('produtos').select('*');
    const { data: funcs } = await meuBanco.from('funcionarios').select('*');
    const { data: saidas } = await meuBanco.from('saidas').select('*, produtos(nome), funcionarios(nome)').gt('qtd_restante', 0);

    const sProd = document.getElementById('saida-produto');
    sProd.innerHTML = '<option value="">Selecione o Produto...</option>';
    if(prods) prods.forEach(p => sProd.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.qtd_estoque})</option>`);

    const sFunc = document.getElementById('saida-func');
    sFunc.innerHTML = '<option value="">Selecione o Funcionário...</option>';
    if(funcs) funcs.forEach(f => sFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`);

    const sVenda = document.getElementById('venda-saida');
    sVenda.innerHTML = '<option value="">Selecione quem está vendendo...</option>';
    if(saidas) saidas.forEach(s => sVenda.innerHTML += `<option value="${s.id}">${s.funcionarios.nome} -> ${s.produtos.nome} (Possui: ${s.qtd_restante})</option>`);
}

async function renderTables() {
    const { data: funcs } = await meuBanco.from('funcionarios').select('*');
    const tFunc = document.querySelector('#table-funcionarios tbody');
    tFunc.innerHTML = '';
    if(funcs) funcs.forEach(f => tFunc.innerHTML += `<tr><td>${f.id}</td><td>${f.nome}</td></tr>`);

    const { data: prods } = await meuBanco.from('produtos').select('*');
    const tProd = document.querySelector('#table-produtos tbody');
    tProd.innerHTML = '';
    if(prods) prods.forEach(p => tProd.innerHTML += `<tr><td>${p.nome}</td><td>${p.qtd_estoque}</td><td>R$ ${p.custo_producao.toFixed(2)}</td><td>R$ ${p.preco_venda.toFixed(2)}</td></tr>`);

    const { data: saidas } = await meuBanco.from('saidas').select('*, produtos(nome), funcionarios(nome)');
    const tSaidas = document.querySelector('#table-saidas tbody');
    tSaidas.innerHTML = '';
    if(saidas) saidas.forEach(s => tSaidas.innerHTML += `<tr><td>${s.funcionarios?.nome || 'N/A'}</td><td>${s.produtos?.nome || 'N/A'}</td><td>${s.qtd_inicial}</td><td>${s.qtd_restante}</td></tr>`);

    const { data: vendas } = await meuBanco.from('vendas').select('*, saidas(produtos(nome), funcionarios(nome))');
    const tVendas = document.querySelector('#table-vendas tbody');
    tVendas.innerHTML = '';
    if(vendas) {
        vendas.forEach(v => {
            const isPendente = v.status === 'Pendente';
            const statusClass = isPendente ? 'status-pendente' : 'status-pago';
            const botaoAcao = isPendente ? `<button class="btn-baixa" onclick="darBaixa(${v.id})">Marcar Pago</button>` : 'Concluído';

            tVendas.innerHTML += `
                <tr>
                    <td>${v.saidas?.funcionarios?.nome || 'N/A'}</td>
                    <td>${v.saidas?.produtos?.nome || 'N/A'}</td>
                    <td>${v.cliente}</td>
                    <td>${v.qtd}</td>
                    <td>R$ ${parseFloat(v.total).toFixed(2)}</td>
                    <td><span class="${statusClass}">${v.status}</span></td>
                    <td>${botaoAcao}</td>
                </tr>`;
        });
    }
}

async function renderDashboard() {
    const { data: prods } = await meuBanco.from('produtos').select('*');
    const { data: saidas } = await meuBanco.from('saidas').select('*, funcionarios(nome), produtos(nome)');
    const { data: vendas } = await meuBanco.from('vendas').select('*, saidas(produtos(custo_producao))');

    let totalEstoque = prods ? prods.reduce((acc, p) => acc + p.qtd_estoque, 0) : 0;
    let totalNaRua = saidas ? saidas.reduce((acc, s) => acc + s.qtd_restante, 0) : 0;
    let receita = 0;
    let gastos = 0;

    if (vendas) {
        vendas.forEach(v => {
            if (v.status === 'Pago') receita += parseFloat(v.total);
            const custoUnitario = parseFloat(v.saidas?.produtos?.custo_producao || 0);
            gastos += (v.qtd * custoUnitario);
        });
    }

    let lucro = receita - gastos;

    document.getElementById('dash-estoque').innerText = totalEstoque;
    document.getElementById('dash-rua').innerText = totalNaRua;
    document.getElementById('dash-receita').innerText = `R$ ${receita.toFixed(2)}`;
    document.getElementById('dash-gastos').innerText = `R$ ${gastos.toFixed(2)}`;
    document.getElementById('dash-lucro').innerText = `R$ ${lucro.toFixed(2)}`;

    const tDashRua = document.querySelector('#table-dash-rua tbody');
    tDashRua.innerHTML = '';
    if(saidas) {
        saidas.filter(s => s.qtd_restante > 0).forEach(s => {
            tDashRua.innerHTML += `<tr><td>${s.funcionarios?.nome || 'N/A'}</td><td>${s.produtos?.nome || 'N/A'}</td><td>${s.qtd_restante}</td></tr>`;
        });
    }
}

// Inicializa a coleta de dados
if(meuBanco) fetchData();

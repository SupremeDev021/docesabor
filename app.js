// Configurações do Supabase - INSIRA SEUS DADOS AQUI
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_KEY";

const supabase = crypto.subtle ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Controle de Navegação de Abas
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    fetchData();
}

// Calculadora de Precificação Inteligente
function calcularPreco() {
    const custo = parseFloat(document.getElementById('calc-custo').value) || 0;
    const margem = parseFloat(document.getElementById('calc-margem').value) || 0;
    
    // Cálculo básico de Markup/Margem sobre o custo
    const precoSugerido = custo + (custo * (margem / 100));
    
    document.getElementById('calc-resultado').innerText = `R$ ${precoSugerido.toFixed(2)}`;
}

// --- CHAMADAS E FLUXOS DO BANCO DE DADOS (SUPABASE) ---

async function fetchData() {
    if (!supabase) return;
    await renderSelects();
    await renderTables();
    await renderDashboard();
}

// Cadastrar Funcionário
document.getElementById('form-funcionario').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nome = document.getElementById('func-nome').value;
    
    await supabase.from('funcionarios').insert([{ nome }]);
    this.reset();
    fetchData();
});

// Cadastrar Produto
document.getElementById('form-produto').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nome = document.getElementById('prod-nome').value;
    const qtd_estoque = parseInt(document.getElementById('prod-qtd').value);
    const custo_producao = parseFloat(document.getElementById('prod-custo').value);
    const preco_venda = parseFloat(document.getElementById('prod-preco').value);

    await supabase.from('produtos').insert([{ nome, qtd_estoque, custo_producao, preco_venda }]);
    this.reset();
    fetchData();
});

// Registrar Saída para a Rua
document.getElementById('form-saida').addEventListener('submit', async function(e) {
    e.preventDefault();
    const produto_id = parseInt(document.getElementById('saida-produto').value);
    const funcionario_id = parseInt(document.getElementById('saida-func').value);
    const qtd = parseInt(document.getElementById('saida-qtd').value);

    // Verificar estoque atual
    let { data: prod } = await supabase.from('produtos').select('qtd_estoque').eq('id', produto_id).single();
    if (prod.qtd_estoque < qtd) return alert('Estoque interno insuficiente!');

    // Deduz do estoque e cria saída
    await supabase.from('produtos').update({ qtd_estoque: prod.qtd_estoque - qtd }).eq('id', produto_id);
    await supabase.from('saidas').insert([{ produto_id, funcionario_id, qtd_inicial: qtd, qtd_restante: qtd }]);
    
    this.reset();
    fetchData();
});

// Registrar Venda
document.getElementById('form-venda').addEventListener('submit', async function(e) {
    e.preventDefault();
    const saida_id = parseInt(document.getElementById('venda-saida').value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    const status = document.getElementById('venda-status').value;

    let { data: saida } = await supabase.from('saidas').select('*, produtos(preco_venda)').eq('id', saida_id).single();
    if (saida.qtd_restante < qtd) return alert('O funcionário não tem essa quantidade toda na rua!');

    const total = qtd * saida.produtos.preco_venda;

    // Atualiza quantidade restante com o funcionário e insere a venda
    await supabase.from('saidas').update({ qtd_restante: saida.qtd_restante - qtd }).eq('id', saida_id);
    await supabase.from('vendas').insert([{ saida_id, qtd, cliente, total, status }]);

    this.reset();
    fetchData();
});

// AÇÃO: Dar Baixa em Pagamento Pendente
async function darBaixa(vendaId) {
    await supabase.from('vendas').update({ status: 'Pago' }).eq('id', vendaId);
    fetchData();
}

// --- ATUALIZAÇÃO DOS COMPONENTES VISUAIS ---

async function renderSelects() {
    const { data: prods } = await supabase.from('produtos').select('*');
    const { data: funcs } = await supabase.from('funcionarios').select('*');
    const { data: saidas } = await supabase.from('saidas').select('*, produtos(nome), funcionarios(nome)').gt('qtd_restante', 0);

    // Select de produtos (Aba Saídas)
    const sProd = document.getElementById('saida-produto');
    sProd.innerHTML = '<option value="">Selecione o Produto...</option>';
    if(prods) prods.forEach(p => sProd.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.qtd_estoque})</option>`);

    // Select de funcionários (Aba Saídas)
    const sFunc = document.getElementById('saida-func');
    sFunc.innerHTML = '<option value="">Selecione o Funcionário...</option>';
    if(funcs) funcs.forEach(f => sFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`);

    // Select de lotes ativos na rua (Aba Vendas)
    const sVenda = document.getElementById('venda-saida');
    sVenda.innerHTML = '<option value="">Selecione quem está vendendo...</option>';
    if(saidas) saidas.forEach(s => sVenda.innerHTML += `<option value="${s.id}">${s.funcionarios.nome} -> ${s.produtos.nome} (Possui: ${s.qtd_restante})</option>`);
}

async function renderTables() {
    // Tabela Funcionários
    const { data: funcs } = await supabase.from('funcionarios').select('*');
    const tFunc = document.querySelector('#table-funcionarios tbody');
    tFunc.innerHTML = '';
    if(funcs) funcs.forEach(f => tFunc.innerHTML += `<tr><td>${f.id}</td><td>${f.nome}</td></tr>`);

    // Tabela Produtos
    const { data: prods } = await supabase.from('produtos').select('*');
    const tProd = document.querySelector('#table-produtos tbody');
    tProd.innerHTML = '';
    if(prods) prods.forEach(p => tProd.innerHTML += `<tr><td>${p.nome}</td><td>${p.qtd_estoque}</td><td>R$ ${p.custo_producao.toFixed(2)}</td><td>R$ ${p.preco_venda.toFixed(2)}</td></tr>`);

    // Tabela Saídas
    const { data: saidas } = await supabase.from('saidas').select('*, produtos(nome), funcionarios(nome)');
    const tSaidas = document.querySelector('#table-saidas tbody');
    tSaidas.innerHTML = '';
    if(saidas) saidas.forEach(s => tSaidas.innerHTML += `<tr><td>${s.funcionarios?.nome || 'Excluído'}</td><td>${s.produtos?.nome || 'Excluído'}</td><td>${s.qtd_inicial}</td><td>${s.qtd_restante}</td></tr>`);

    // Tabela Vendas (com botão dinâmico de dar baixa)
    const { data: vendas } = await supabase.from('vendas').select('*, saidas(produtos(nome), funcionarios(nome))');
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
    const { data: prods } = await supabase.from('produtos').select('*');
    const { data: saidas } = await supabase.from('saidas').select('*, funcionarios(nome), produtos(nome)');
    const { data: vendas } = await supabase.from('vendas').select('*, saidas(produtos(custo_producao))');

    // Métricas operacionais
    let totalEstoque = prods ? prods.reduce((acc, p) => acc + p.qtd_estoque, 0) : 0;
    let totalNaRua = saidas ? saidas.reduce((acc, s) => acc + s.qtd_restante, 0) : 0;

    // Métricas financeiras (Receita x Gastos x Lucro)
    let receita = 0;
    let gastos = 0;

    if (vendas) {
        vendas.forEach(v => {
            if (v.status === 'Pago') {
                receita += parseFloat(v.total);
            }
            // O gasto é calculado baseado no custo de fabricação de tudo que já saiu e foi vendido
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

    // Tabela resumida do Dashboard (Quem está na rua)
    const tDashRua = document.querySelector('#table-dash-rua tbody');
    tDashRua.innerHTML = '';
    if(saidas) {
        saidas.filter(s => s.qtd_restante > 0).forEach(s => {
            tDashRua.innerHTML += `<tr><td>${s.funcionarios?.nome || 'N/A'}</td><td>${s.produtos?.nome || 'N/A'}</td><td>${s.qtd_restante}</td></tr>`;
        });
    }
}

// Inicialização automática do painel
if(supabase) fetchData();

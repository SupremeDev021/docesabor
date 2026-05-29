// Configurações do Supabase - INSIRA SEUS DADOS AQUI
const SUPABASE_URL = "SUA_URL_AQUI";
const SUPABASE_ANON_KEY = "SUA_CHAVE_AQUI";

// Trava de segurança para evitar o erro "Identifier has already been declared"
if (!window.supabaseClient && window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;

// Controle de Navegação de Abas
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`nav-${tabId}`).classList.add('active');
    fetchData();
}

// --- LÓGICA DA CALCULADORA INTELIGENTE ---
let insumos = []; // Memória temporária dos itens adicionados

function adicionarInsumo() {
    const nomeInput = document.getElementById('insumo-nome');
    const valorInput = document.getElementById('insumo-valor');
    const nome = nomeInput.value.trim() || 'Item sem nome';
    const valor = parseFloat(valorInput.value);

    if (isNaN(valor) || valor <= 0) return alert('Insira um valor válido para o item!');

    // Adiciona na lista
    insumos.push({ id: Date.now(), nome, valor });
    
    // Limpa os campos para o próximo item
    nomeInput.value = '';
    valorInput.value = '';
    
    atualizarListaInsumos();
}

function removerInsumo(id) {
    insumos = insumos.filter(item => item.id !== id);
    atualizarListaInsumos();
}

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

    // Joga a soma total para o campo readonly de custo
    document.getElementById('calc-custo').value = custoTotal.toFixed(2);
    calcularPreco(); // Recalcula o preço de venda automaticamente
}

function calcularPreco() {
    const custo = parseFloat(document.getElementById('calc-custo').value) || 0;
    const margem = parseFloat(document.getElementById('calc-margem').value) || 0;
    
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

    let { data: prod } = await supabase.from('produtos').select('qtd_estoque').eq('id', produto_id).single();
    if (prod.qtd_estoque < qtd) return alert('Estoque interno insuficiente!');

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
    if (saida.qtd_restante < qtd) return alert('O funcionário não tem essa quantidade na rua!');

    const total = qtd * saida.produtos.preco_venda;

    await supabase.from('saidas').update({ qtd_restante: saida.qtd_restante - qtd }).eq('id', saida_id);
    await supabase.from('vendas').insert([{ saida_id, qtd, cliente, total, status }]);

    this.reset();
    fetchData();
});

// Dar Baixa
async function darBaixa(vendaId) {
    await supabase.from('vendas').update({ status: 'Pago' }).eq('id', vendaId);
    fetchData();
}

// --- ATUALIZAÇÃO VISUAL (Tabelas e Dashboard) ---

async function renderSelects() {
    const { data: prods } = await supabase.from('produtos').select('*');
    const { data: funcs } = await supabase.from('funcionarios').select('*');
    const { data: saidas } = await supabase.from('saidas').select('*, produtos(nome), funcionarios(nome)').gt('qtd_restante', 0);

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
    const { data: funcs } = await supabase.from('funcionarios').select('*');
    const tFunc = document.querySelector('#table-funcionarios tbody');
    tFunc.innerHTML = '';
    if(funcs) funcs.forEach(f => tFunc.innerHTML += `<tr><td>${f.id}</td><td>${f.nome}</td></tr>`);

    const { data: prods } = await supabase.from('produtos').select('*');
    const tProd = document.querySelector('#table-produtos tbody');
    tProd.innerHTML = '';
    if(prods) prods.forEach(p => tProd.innerHTML += `<tr><td>${p.nome}</td><td>${p.qtd_estoque}</td><td>R$ ${p.custo_producao.toFixed(2)}</td><td>R$ ${p.preco_venda.toFixed(2)}</td></tr>`);

    const { data: saidas } = await supabase.from('saidas').select('*, produtos(nome), funcionarios(nome)');
    const tSaidas = document.querySelector('#table-saidas tbody');
    tSaidas.innerHTML = '';
    if(saidas) saidas.forEach(s => tSaidas.innerHTML += `<tr><td>${s.funcionarios?.nome || 'N/A'}</td><td>${s.produtos?.nome || 'N/A'}</td><td>${s.qtd_inicial}</td><td>${s.qtd_restante}</td></tr>`);

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
if(supabase) fetchData();

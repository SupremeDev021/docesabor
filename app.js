// ==========================================
// 1. MOTOR DE MODAL CUSTOMIZADO (Substitui alert, confirm e prompt)
// ==========================================
window.SysModal = {
    show: function(type, message, defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('sys-modal-overlay');
            const title = document.getElementById('sys-modal-title');
            const msg = document.getElementById('sys-modal-message');
            const input = document.getElementById('sys-modal-input');
            const btnCancel = document.getElementById('sys-modal-btn-cancel');
            const btnConfirm = document.getElementById('sys-modal-btn-confirm');

            msg.innerText = message;
            overlay.classList.add('active');

            // Reset do estado do modal
            input.style.display = 'none';
            btnCancel.style.display = 'none';
            input.value = '';

            if (type === 'alert') {
                title.innerText = 'Aviso do Sistema';
            } else if (type === 'confirm') {
                title.innerText = 'Confirmação';
                btnCancel.style.display = 'block';
            } else if (type === 'prompt') {
                title.innerText = 'Entrada de Dados';
                btnCancel.style.display = 'block';
                input.style.display = 'block';
                input.value = defaultValue;
                setTimeout(() => input.focus(), 100);
            }

            // Ações dos botões
            const cleanup = () => {
                overlay.classList.remove('active');
                btnConfirm.onclick = null;
                btnCancel.onclick = null;
            };

            btnConfirm.onclick = () => {
                cleanup();
                resolve(type === 'prompt' ? input.value : true);
            };

            btnCancel.onclick = () => {
                cleanup();
                resolve(type === 'prompt' ? null : false);
            };
        });
    },
    alert: (msg) => window.SysModal.show('alert', msg),
    confirm: (msg) => window.SysModal.show('confirm', msg),
    prompt: (msg, def) => window.SysModal.show('prompt', msg, def)
};


// ==========================================
// 2. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = "https://kfnvhqspzefdvfkgbawp.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnZocXNwemVmZHZma2diYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjE3MTcsImV4cCI6MjA5NTU5NzcxN30.JOWCOAszK1W3GOklrwhKUAy_lGbuX7WGmlwAdsIvBj8";

var meuBanco = null;

try {
    if (window.supabase) {
        meuBanco = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (erro) {
    console.error("Erro ao iniciar o banco de dados:", erro);
}

// ==========================================
// 3. NAVEGAÇÃO DE ABAS 
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
// 4. LÓGICA DA CALCULADORA INTELIGENTE
// ==========================================
var insumos = []; 

window.adicionarInsumo = async function() {
    const nomeInput = document.getElementById('insumo-nome');
    const valorInput = document.getElementById('insumo-valor');
    const nome = nomeInput.value.trim() || 'Item sem nome';
    const valor = parseFloat(valorInput.value);

    if (isNaN(valor) || valor <= 0) {
        await SysModal.alert('Insira um valor válido para o item!');
        return;
    }

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
                <span>R$ ${item.valor.toFixed(2)} <span class="btn-remover" onclick="window.removerInsumo(${item.id})">X</span></span>
            </li>
        `;
    });

    document.getElementById('calc-custo').value = custoTotal.toFixed(2);
    window.calcularPreco(); 
}

window.calcularPreco = function() {
    const custoTotal = parseFloat(document.getElementById('calc-custo').value) || 0;
    const rendimento = parseInt(document.getElementById('calc-rendimento').value) || 1;
    const despesas = parseFloat(document.getElementById('calc-despesas').value) || 0;
    const margem = parseFloat(document.getElementById('calc-margem').value) || 0;
    
    const qtdValida = rendimento > 0 ? rendimento : 1;
    const custoUnitario = custoTotal / qtdValida;
    const somaPorcentagens = despesas + margem;

    let precoSugerido = 0;

    if (somaPorcentagens >= 100) {
        document.getElementById('calc-resultado').innerText = "Erro: % >= 100";
        return; 
    } 
    
    if (somaPorcentagens === 0) {
        precoSugerido = custoUnitario;
    } else {
        const indice = 100 / (100 - somaPorcentagens);
        precoSugerido = custoUnitario * indice;
    }
    
    document.getElementById('calc-resultado').innerText = `R$ ${precoSugerido.toFixed(2)}`;
};

// ==========================================
// 5. FLUXOS DO BANCO DE DADOS E FORMULÁRIOS
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
    if(!meuBanco) { await SysModal.alert("Banco de dados não conectado."); return; }
    const nome = document.getElementById('func-nome').value;
    
    await meuBanco.from('funcionarios').insert([{ nome }]);
    this.reset();
    fetchData();
});

// Cadastrar Cliente
document.getElementById('form-cliente').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) { await SysModal.alert("Banco de dados não conectado."); return; }
    const nome = document.getElementById('cli-nome').value;
    const telefone = document.getElementById('cli-telefone').value;

    await meuBanco.from('clientes').insert([{ nome, telefone }]);
    this.reset();
    fetchData();
});

// Cadastrar Produto
document.getElementById('form-produto').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) { await SysModal.alert("Banco de dados não conectado."); return; }
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
    if(!meuBanco) { await SysModal.alert("Banco de dados não conectado."); return; }
    const produto_id = parseInt(document.getElementById('saida-produto').value);
    const funcionario_id = parseInt(document.getElementById('saida-func').value);
    const qtd = parseInt(document.getElementById('saida-qtd').value);

    let { data: prod } = await meuBanco.from('produtos').select('qtd_estoque').eq('id', produto_id).single();
    if (prod.qtd_estoque < qtd) {
        await SysModal.alert('Estoque interno insuficiente!');
        return;
    }

    await meuBanco.from('produtos').update({ qtd_estoque: prod.qtd_estoque - qtd }).eq('id', produto_id);
    await meuBanco.from('saidas').insert([{ produto_id, funcionario_id, qtd_inicial: qtd, qtd_restante: qtd }]);
    
    this.reset();
    fetchData();
});

// Registrar Venda
document.getElementById('form-venda').addEventListener('submit', async function(e) {
    e.preventDefault();
    if(!meuBanco) { await SysModal.alert("Banco de dados não conectado."); return; }
    const saida_id = parseInt(document.getElementById('venda-saida').value);
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    const status = document.getElementById('venda-status').value;

    let { data: saida } = await meuBanco.from('saidas').select('*, produtos(preco_venda)').eq('id', saida_id).single();
    if (saida.qtd_restante < qtd) {
        await SysModal.alert('O funcionário não tem essa quantidade na rua!');
        return;
    }

    const total = qtd * saida.produtos.preco_venda;

    await meuBanco.from('saidas').update({ qtd_restante: saida.qtd_restante - qtd }).eq('id', saida_id);
    await meuBanco.from('vendas').insert([{ saida_id, qtd, cliente, total, status }]);

    this.reset();
    fetchData();
});

// Ações nas Tabelas
window.darBaixa = async function(vendaId) {
    if(!meuBanco) return;
    await meuBanco.from('vendas').update({ status: 'Pago' }).eq('id', vendaId);
    fetchData();
};

window.alterarEstoque = async function(id, qtdAtual) {
    let novaQtd = await SysModal.prompt("Digite a nova quantidade em estoque para este produto:", qtdAtual);
    if (novaQtd !== null && novaQtd.trim() !== "") {
        novaQtd = parseInt(novaQtd);
        if (!isNaN(novaQtd) && novaQtd >= 0) {
            await meuBanco.from('produtos').update({ qtd_estoque: novaQtd }).eq('id', id);
            fetchData();
        } else {
            await SysModal.alert("Por favor, digite um número válido maior ou igual a zero.");
        }
    }
};

window.excluirProduto = async function(id) {
    const confirmou = await SysModal.confirm("ATENÇÃO: Tem certeza que deseja excluir este produto?");
    if (confirmou) {
        await meuBanco.from('produtos').delete().eq('id', id);
        fetchData();
    }
};

window.excluirCliente = async function(id) {
    const confirmou = await SysModal.confirm("Deseja excluir este cliente da base?");
    if (confirmou) {
        await meuBanco.from('clientes').delete().eq('id', id);
        fetchData();
    }
};

// ==========================================
// 6. ATUALIZAÇÃO VISUAL (Tabelas e Dashboard)
// ==========================================

async function renderSelects() {
    const { data: prods } = await meuBanco.from('produtos').select('*');
    const { data: funcs } = await meuBanco.from('funcionarios').select('*');
    const { data: clientes } = await meuBanco.from('clientes').select('*').order('nome', { ascending: true });
    const { data: saidas } = await meuBanco.from('saidas').select('*, produtos(nome), funcionarios(nome)').gt('qtd_restante', 0);

    const sProd = document.getElementById('saida-produto');
    sProd.innerHTML = '<option value="">Selecione o Produto...</option>';
    if(prods) prods.forEach(p => sProd.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.qtd_estoque})</option>`);

    const sFunc = document.getElementById('saida-func');
    sFunc.innerHTML = '<option value="">Selecione o Funcionário...</option>';
    if(funcs) funcs.forEach(f => sFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`);

    const sCli = document.getElementById('venda-cliente');
    sCli.innerHTML = '<option value="">Selecione o Cliente...</option>';
    if(clientes) clientes.forEach(c => sCli.innerHTML += `<option value="${c.nome}">${c.nome} (${c.telefone})</option>`);

    const sVenda = document.getElementById('venda-saida');
    sVenda.innerHTML = '<option value="">Selecione quem está vendendo...</option>';
    if(saidas) saidas.forEach(s => sVenda.innerHTML += `<option value="${s.id}">${s.funcionarios.nome} -> ${s.produtos.nome} (Possui: ${s.qtd_restante})</option>`);
}

async function renderTables() {
    const { data: funcs } = await meuBanco.from('funcionarios').select('*');
    const tFunc = document.querySelector('#table-funcionarios tbody');
    tFunc.innerHTML = '';
    if(funcs) funcs.forEach(f => tFunc.innerHTML += `<tr><td>${f.id}</td><td>${f.nome}</td></tr>`);

    const { data: clientes } = await meuBanco.from('clientes').select('*').order('nome', { ascending: true });
    const tCli = document.querySelector('#table-clientes tbody');
    if(tCli) {
        tCli.innerHTML = '';
        if(clientes) clientes.forEach(c => tCli.innerHTML += `<tr><td>${c.nome}</td><td>${c.telefone}</td><td><button class="btn-acao btn-excluir" onclick="window.excluirCliente(${c.id})">Excluir</button></td></tr>`);
    }

    const { data: prods } = await meuBanco.from('produtos').select('*').order('nome', { ascending: true });
    const tProd = document.querySelector('#table-produtos tbody');
    tProd.innerHTML = '';
    if(prods) {
        prods.forEach(p => {
            tProd.innerHTML += `
                <tr>
                    <td>${p.nome}</td>
                    <td>${p.qtd_estoque}</td>
                    <td>R$ ${p.custo_producao.toFixed(2)}</td>
                    <td>R$ ${p.preco_venda.toFixed(2)}</td>
                    <td>
                        <button class="btn-acao btn-editar" onclick="window.alterarEstoque(${p.id}, ${p.qtd_estoque})">Alterar Qtd</button>
                        <button class="btn-acao btn-excluir" onclick="window.excluirProduto(${p.id})">Excluir</button>
                    </td>
                </tr>`;
        });
    }

    const { data: saidas } = await meuBanco.from('saidas').select('*, produtos(nome), funcionarios(nome)');
    const tSaidas = document.querySelector('#table-saidas tbody');
    tSaidas.innerHTML = '';
    if(saidas) saidas.forEach(s => tSaidas.innerHTML += `<tr><td>${s.funcionarios?.nome || 'Excluído'}</td><td>${s.produtos?.nome || 'Excluído'}</td><td>${s.qtd_inicial}</td><td>${s.qtd_restante}</td></tr>`);

    await window.renderVendas();
}

window.renderVendas = async function() {
    const fFunc = document.getElementById('filtro-func')?.value.toLowerCase() || '';
    const fCli = document.getElementById('filtro-cli')?.value.toLowerCase() || '';
    const fProd = document.getElementById('filtro-prod')?.value.toLowerCase() || '';
    const fStatus = document.getElementById('filtro-status')?.value || '';

    const { data: vendas } = await meuBanco.from('vendas')
        .select('*, saidas(produtos(nome), funcionarios(nome))')
        .order('created_at', { ascending: false });

    const tVendas = document.querySelector('#table-vendas tbody');
    tVendas.innerHTML = '';

    if (vendas) {
        let filtrados = vendas.filter(v => {
            const funcNome = (v.saidas?.funcionarios?.nome || '').toLowerCase();
            const prodNome = (v.saidas?.produtos?.nome || '').toLowerCase();
            const cliNome = (v.cliente || '').toLowerCase();

            return (fFunc === '' || funcNome.includes(fFunc)) &&
                   (fCli === '' || cliNome.includes(fCli)) &&
                   (fProd === '' || prodNome.includes(fProd)) &&
                   (fStatus === '' || v.status === fStatus);
        });

        filtrados.slice(0, 10).forEach(v => {
            const isPendente = v.status === 'Pendente';
            const statusClass = isPendente ? 'status-pendente' : 'status-pago';
            const botaoAcao = isPendente ? `<button class="btn-baixa" onclick="window.darBaixa(${v.id})">Marcar Pago</button>` : 'Concluído';

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
};

async function renderDashboard() {
    const { data: prods } = await meuBanco.from('produtos').select('*');
    const { data: saidas } = await meuBanco.from('saidas').select('*, funcionarios(nome), produtos(nome)');
    const { data: vendas } = await meuBanco.from('vendas').select('*, saidas(produtos(custo_producao))');

    let totalEstoque = prods ? prods.reduce((acc, p) => acc + p.qtd_estoque, 0) : 0;
    let totalNaRua = saidas ? saidas.reduce((acc, s) => acc + s.qtd_restante, 0) : 0;
    
    let receita = 0;
    let gastos = 0;
    let pendenteRua = 0; 

    if (vendas) {
        vendas.forEach(v => {
            if (v.status === 'Pago') {
                receita += parseFloat(v.total);
            } else if (v.status === 'Pendente') {
                pendenteRua += parseFloat(v.total);
            }
            
            const custoUnitario = parseFloat(v.saidas?.produtos?.custo_producao || 0);
            gastos += (v.qtd * custoUnitario);
        });
    }

    let lucro = receita - gastos;

    document.getElementById('dash-estoque').innerText = totalEstoque;
    document.getElementById('dash-rua').innerText = totalNaRua;
    document.getElementById('dash-receita').innerText = `R$ ${receita.toFixed(2)}`;
    document.getElementById('dash-pendente').innerText = `R$ ${pendenteRua.toFixed(2)}`;
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

if(meuBanco) fetchData();

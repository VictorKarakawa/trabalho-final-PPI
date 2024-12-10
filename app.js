const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 }
}));

const users = [];
const messages = [];

function requireLogin(req, res, next) {
    if (!req.session.user) return res.send(renderLoginPage('Por favor, faça login.'));
    next();
}

function renderLoginPage(error = '') {
    return `
    <html>
    <head><title>Login</title><link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"></head>
    <body class="container">
        <h1 class="mt-4">Login</h1>
        ${error ? `<p class="text-danger">${error}</p>` : ''}
        <form method="POST" action="/login" class="mt-3">
            <div class="form-group">
                <label>Email:</label><input type="email" name="email" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Senha:</label><input type="password" name="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary">Entrar</button>
        </form>
        <a href="/cadastro" class="btn btn-link mt-2">Cadastrar-se</a>
    </body>
    </html>`;
}

function renderCadastroPage(usersList = [], error = '') {
    const listaUsuarios = usersList.map(u => `<li>${u.nome} (${u.nickname}) - ${u.email}</li>`).join('');
    return `
    <html>
    <head><title>Cadastro</title><link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"></head>
    <body class="container">
        <h1 class="mt-4">Cadastro de Usuários</h1>
        ${error ? `<p class="text-danger">${error}</p>` : ''}
        <form method="POST" action="/cadastro" class="mt-3">
            <div class="form-group">
                <label>Nome:</label><input type="text" name="nome" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Data de Nascimento:</label><input type="date" name="data_nascimento" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Nickname:</label><input type="text" name="nickname" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Email:</label><input type="email" name="email" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Senha:</label><input type="password" name="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary">Cadastrar</button>
        </form>
        <h2 class="mt-4">Usuários Cadastrados:</h2>
        <ul>${listaUsuarios || '<p>Nenhum usuário cadastrado ainda.</p>'}</ul>
        <a href="/menu" class="btn btn-link">Voltar ao Menu</a>
    </body>
    </html>`;
}

function renderMenuPage(lastAccess) {
    return `
    <html>
    <head><title>Menu</title><link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"></head>
    <body class="container">
        <h1 class="mt-4">Menu Principal</h1>
        <p>Último acesso: ${lastAccess || 'Primeiro acesso'}</p>
        <ul>
            <li><a href="/cadastro">Cadastro de Usuários</a></li>
            <li><a href="/chat">Bate-papo</a></li>
            <li><a href="/logout">Sair</a></li>
        </ul>
    </body>
    </html>`;
}

function renderChatPage(user) {
    const userOptions = users.map(u => `<option value="${u.nickname}">${u.nickname}</option>`).join('');
    const messagesList = messages.map(msg => `<p><b>${msg.user}</b> [${msg.date}]: ${msg.text}</p>`).join('');
    return `
    <html>
    <head><title>Bate-papo</title><link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"></head>
    <body class="container">
        <h1 class="mt-4">Bate-papo</h1>
        <div class="mt-3">${messagesList || '<p>Nenhuma mensagem ainda.</p>'}</div>
        <form method="POST" action="/chat" class="mt-3">
            <div class="form-group">
                <label>Usuário:</label>
                <select name="user" class="form-control" required>
                    <option value="">Selecione um usuário</option>
                    ${userOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Mensagem:</label>
                <input type="text" name="message" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary">Enviar</button>
        </form>
        <a href="/menu" class="btn btn-link">Voltar ao Menu</a>
    </body>
    </html>`;
}

app.get('/', (req, res) => {
    res.send(renderLoginPage());
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        req.session.user = user;
        res.cookie('lastAccess', new Date().toLocaleString());
        return res.redirect('/menu');
    }
    res.send(renderLoginPage('Credenciais inválidas.'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/cadastro', (req, res) => {
    res.send(renderCadastroPage(users));
});

app.post('/cadastro', (req, res) => {
    const { nome, data_nascimento, nickname, email, password } = req.body;
    if (users.find(u => u.email === email)) {
        return res.send(renderCadastroPage(users, 'Email já cadastrado.'));
    }
    users.push({ nome, data_nascimento, nickname, email, password });
    res.send(renderCadastroPage(users));
});

app.get('/menu', requireLogin, (req, res) => {
    const lastAccess = req.cookies.lastAccess;
    res.send(renderMenuPage(lastAccess));
});

app.get('/chat', requireLogin, (req, res) => {
    res.send(renderChatPage(req.session.user));
});

app.post('/chat', requireLogin, (req, res) => {
    const { user, message } = req.body;
    if (!user || !message) return res.redirect('/chat');
    const date = new Date().toLocaleString();
    messages.push({ user, text: message, date });
    res.redirect('/chat');
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));

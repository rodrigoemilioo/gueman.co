class Router {
    constructor() {
        this.routes = {};
        this.init();
    }

    init() {
        window.onpopstate = () => this.handleRoute(location.pathname);
        this.handleRoute(location.pathname);
    }

    addRoute(path, callback) {
        this.routes[path] = callback;
    }

    navigate(path) {
        history.pushState({}, '', path);
        this.handleRoute(path);
    }

    handleRoute(path) {
        const route = this.routes[path] || this.routes['/404'];
        if (route) {
            route();
        }
    }
}

// Example usage:
const router = new Router();

router.addRoute('/home', () => {
    document.body.innerHTML = '<h1>Home</h1>';
});
router.addRoute('/catalogo', () => {
    document.body.innerHTML = '<h1>Catalogo</h1>';
});
router.addRoute('/produto/:id', () => {
    const id = location.pathname.split('/produto/')[1];
    document.body.innerHTML = `<h1>Produto ${id}</h1>`;
});
router.addRoute('/404', () => {
    document.body.innerHTML = '<h1>404 Not Found</h1>';
});

// Navigate to a route
// router.navigate('/home');
// router.navigate('/catalogo');
// router.navigate('/produto/1');

let idCanton = document.getElementById('idCanton');
//    document.getElementsByClassName("op").innerHTML = ""
async function fnProvincia(element) {
    document.getElementById('idCanton').options.length = 0;
    document.getElementById('idDistrito').options.length = 0;
    let url = `http://localhost:4000/users/direction-canton/${element}`;
    let response = await fetch(url);
    let commits = await response.json()
    let fragment = new DocumentFragment()
    commits.forEach(function (valor, indice, array) {
        let option = document.createElement("option")
        option.setAttribute("class", "op");
        option.setAttribute("value", `${valor.codigo_canton}`);
        option.innerHTML = valor.nombre_canton
        fragment.appendChild(option)
    })
    idCanton.appendChild(fragment)
}

async function fnCanton(element) {
    document.getElementById('idDistrito').options.length = 0;
    let idDistrito = document.getElementById('idDistrito');
    let url = `http://localhost:4000/users/direction-distrito/${element}`;
    let response = await fetch(url);
    let commits = await response.json()
    let fragment = new DocumentFragment()
    commits.forEach(function (valor, indice, array) {
        let option = document.createElement("option")
        option.setAttribute("class", "op");
        option.setAttribute("value", `${valor.codigo_distrito}`);
        option.innerHTML = valor.nombre_distrito
        fragment.appendChild(option)
    })
    idDistrito.appendChild(fragment)
}

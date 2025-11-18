function preprocess(expr) {
    expr = expr.trim();

    // π → pi
    expr = expr.replace(/π/g, "pi");

    // n√x  -> (x)^(1/n)
    expr = expr.replace(/(\d+)\s*√\s*([0-9a-zA-Zπpi\[\]\(\)\.\+\-\*\/]+)/g,
                        "($2)^(1/$1)");

    // √x -> sqrt(x)
    expr = expr.replace(/√\s*([0-9a-zA-Zπpi\[\]\(\)\.\+\-\*\/]+)/g,
                        "sqrt($1)");

    return expr;
}

function calculate() {
    const input = document.getElementById("expr").value;
    const out = document.getElementById("result");

    if (!input.trim()) {
        out.innerText = "Введи выражение 😉";
        return;
    }

    try {
        let expr = preprocess(input);
        let result;

        // --- Производная: d/dx(...) ---
        if (expr.startsWith("d/dx")) {
            const body = expr.slice(4).trim();
            // d/dx expr
            result = nerdamer(`diff(${body}, x)`).toString();
        }

        // --- Интегралы: int(0,5; x^2) или int(x^2) ---
        else if (expr.startsWith("int") || expr.startsWith("∫")) {
            let inside = expr.replace(/^int|^∫/i, "").trim();
            // убираем внешние скобки, если есть
            if (inside.startsWith("(") && inside.endsWith(")")) {
                inside = inside.slice(1, -1).trim();
            }

            if (inside.includes(";")) {
                // определённый: bounds; func
                const parts = inside.split(";");
                if (parts.length !== 2) throw "Формат: int(0,5; x^2)";
                const boundsPart = parts[0].trim();  // "0,5"
                const funcPart   = parts[1].trim();  // "x^2"
                const [aStr, bStr] = boundsPart.split(",");
                const a = aStr.trim();
                const b = bStr.trim();
                result = nerdamer(`defint(${funcPart}, x, ${a}, ${b})`).toString();
            } else {
                // неопределённый: только функция
                const func = inside.trim();
                result = nerdamer(`integrate(${func}, x)`).toString();
            }
        }

        // --- Упрощение: simplify(expr) ---
        else if (expr.startsWith("simplify")) {
            let inside = expr.replace(/^simplify\s*/i, "").trim();
            if (inside.startsWith("(") && inside.endsWith(")")) {
                inside = inside.slice(1, -1);
            }
            result = nerdamer(inside).simplify().toString();
        }

        // --- Раскрытие скобок: expand(expr) ---
        else if (expr.startsWith("expand")) {
            let inside = expr.replace(/^expand\s*/i, "").trim();
            if (inside.startsWith("(") && inside.endsWith(")")) {
                inside = inside.slice(1, -1);
            }
            result = nerdamer(inside).expand().toString();
        }

        // --- Факторизация: factor(expr) ---
        else if (expr.startsWith("factor")) {
            let inside = expr.replace(/^factor\s*/i, "").trim();
            if (inside.startsWith("(") && inside.endsWith(")")) {
                inside = inside.slice(1, -1);
            }
            result = nerdamer(inside).factor().toString();
        }

        // --- Матрицы: det(...), inv(...), rank(...), mul(A,B) ---
        else if (expr.startsWith("det(")) {
            const inside = expr.slice(4, -1);
            const m = math.evaluate(inside);
            result = math.det(m).toString();
        } else if (expr.startsWith("inv(")) {
            const inside = expr.slice(4, -1);
            const m = math.evaluate(inside);
            const inv = math.inv(m);
            result = math.format(inv, {precision: 14});
        } else if (expr.startsWith("rank(")) {
            const inside = expr.slice(5, -1);
            const m = math.evaluate(inside);
            result = math.rank(m).toString();
        } else if (expr.startsWith("mul(")) {
            // mul([[1,2],[3,4]] , [[1],[2]])
            let inside = expr.slice(4, -1);
            const parts = inside.split(",");
            if (parts.length < 2) throw "Формат: mul(A, B)";
            const A = math.evaluate(parts[0]);
            const B = math.evaluate(parts.slice(1).join(",")); // на случай запятых внутри
            const prod = math.multiply(A, B);
            result = math.format(prod, {precision: 14});
        }

        // --- Уравнения и системы: solve(...) ---
        else if (expr.startsWith("solve")) {
            let inside = expr.replace(/^solve\s*/i, "").trim();
            if (inside.startsWith("(") && inside.endsWith(")")) {
                inside = inside.slice(1, -1);
            }

            if (inside.includes(";")) {
                // система: eq1; eq2; x,y
                const parts = inside.split(";");
                if (parts.length < 2) throw "Формат системы: solve(eq1; eq2; x,y)";
                const varsPart = parts[parts.length - 1].trim();
                const varNames = varsPart.split(",").map(v => v.trim());
                const eqParts  = parts.slice(0, -1);

                const eqs = eqParts.map(p => {
                    const s = p.trim();
                    if (s.includes("=")) {
                        const [l, r] = s.split("=");
                        return `${l}-(${r})`;
                    } else {
                        return s; // считаем уже = 0
                    }
                });

                const sol = nerdamer.solveEquations(eqs, varNames);
                result = JSON.stringify(sol);
            } else {
                // одно уравнение: x^2-4=0
                let left, right;
                if (inside.includes("=")) {
                    [left, right] = inside.split("=");
                } else {
                    left = inside;
                    right = "0";
                }
                const eq = `${left}-(${right})`;
                const sol = nerdamer.solve(eq, "x");
                result = sol.toString();
            }
        }

        // --- Обычные выражения: сначала пытаемся символьно, если не вышло — численно ---
        else {
            try {
                result = nerdamer(expr).toString(); // символьный результат
            } catch (e) {
                result = math.evaluate(expr).toString(); // численный
            }
        }

        out.innerText = "Результат: " + result;

    } catch (e) {
        out.innerText = "Ошибка: " + e;
    }
}

#!/usr/bin/env python3
"""WI-006: rewrite task-template 'why' copy to comply with research-manual §11.

Removes: personality-attribution framing (lives in sourceLabel already),
unsourced precise stats, neurotransmitter/mechanism chains, deterministic
superlatives. Keeps the actionable insight, hedged per evidence labels.
"""
import json
import sys

WHYS_EN = {
    "cleanSpace": "A tidy space gives you fewer things to track. Many people find it easier to start real work when the immediate environment is in order.",
    "digitalDeclutter": "Attention is limited. Removing apps and notifications that don't serve your goals leaves more room for the ones that do.",
    "designEnv": "Make the right choice the easy choice: adjusting your environment often works better than relying on willpower alone.",
    "deepWork": "One protected focus block usually beats several scattered attempts. This template carves out that block and gives it a shape.",
    "shutdownRitual": "A clear ending to the workday makes it easier to stop replaying unfinished work. Note what is open and pick it up tomorrow.",
    "brainDump": "Holding every idea in your head costs attention. Writing them down in one place turns a looping list into a manageable one.",
    "weeklyReview": "A weekly pass over your commitments keeps the system trustworthy. Skip it for a few weeks and open loops pile up.",
    "nextAction": "Vague projects stall. Defining one concrete, physical next action makes starting much easier.",
    "morningSunlight": "Morning light exposure is closely tied to how the body times sleep and wakefulness. A short walk outside is the simplest version of this habit.",
    "moveBody": "Regular cardio is associated with better mood, focus, and stress resilience in a large body of research. Start with 20–30 minutes at a pace that suits you.",
    "fixSleep": "Sleep affects nearly everything else on this list. This template walks through the basics of a consistent schedule.",
    "reduceAlcohol": "Alcohol, even in moderate amounts, is associated with lighter, more fragmented sleep. Cutting back for a week shows you the effect directly.",
    "journal": "Writing turns vague worries into specific sentences. Once written down, they are easier to examine and act on.",
    "gratitude": "Naming specific things you are grateful for — what and why — is a simple practice many people find steadies their mood over time.",
    "comparePastSelf": "Comparing yourself to others breeds resentment; comparing to your own past self highlights real progress. This template makes that comparison concrete.",
    "tellTruth": "Small lies are expensive to maintain. Acting honestly, even in small things, removes that maintenance cost.",
    "takeResponsibility": "Focusing on what is inside your control is the practical starting point for changing anything else.",
    "reachOut": "Regular contact with close friends and family is one of the stronger correlates of long-term wellbeing in social research. A short message counts.",
    "repairRelationship": "Small repair attempts after conflict predict relationship health better than avoiding conflict altogether. This template scripts one.",
    "expressAppreciation": "Relationship researchers find healthy relationships lean positive by a wide margin. Deliberate appreciation is the simplest way to add to that side.",
    "deliberatePractice": "Skills grow fastest at the edge of your ability with focused effort and feedback — not through hours alone. This template structures one session.",
    "identifyMission": "A career direction tends to emerge from skills you have built, not from introspection alone. This template maps what you have.",
    "sayNo": "Every yes spends time you cannot refund. Protecting focus hours means declining some things on purpose.",
    "listDebts": "You cannot manage what you have not written down. Listing every debt with its real number is the first step of any payoff plan.",
    "emergencyFund": "A small cash buffer turns surprise expenses from new debt into inconveniences. Even a modest start changes the pattern.",
    "trackSpending": "Guesses about spending are usually wrong. One week of real numbers shows exactly where the money goes.",
    "cancelSubs": "Forgotten subscriptions are a common slow leak. A 15-minute audit of recurring charges often finds at least one.",
    "negotiateBill": "Many bills — internet, phone, insurance — are negotiable with one phone call. The worst outcome is usually 'no'.",
}

WHYS_ES = {
    "cleanSpace": "Un espacio ordenado te da menos cosas que rastrear. Muchas personas les resulta más fácil empezar cuando su entorno inmediato está en orden.",
    "digitalDeclutter": "La atención es limitada. Quitar apps y notificaciones que no sirven a tus metas deja más espacio para las que sí.",
    "designEnv": "Haz que la opción correcta sea la opción fácil: ajustar tu entorno suele funcionar mejor que depender solo de la fuerza de voluntad.",
    "deepWork": "Un bloque de enfoque protegido suele rendir más que varios intentos dispersos. Esta plantilla reserva ese bloque y le da forma.",
    "shutdownRitual": "Un final claro para la jornada facilita dejar de dar vueltas al trabajo pendiente. Anota lo que quedó abierto y retómalo mañana.",
    "brainDump": "Cargar cada idea en la cabeza cuesta atención. Escribirlas en un solo lugar convierte una lista en bucle en una lista manejable.",
    "weeklyReview": "Un repaso semanal de tus compromisos mantiene confiable el sistema. Sáltatelo unas semanas y los pendientes se acumulan.",
    "nextAction": "Los proyectos vagos se estancan. Definir una acción concreta y física hace que empezar sea mucho más fácil.",
    "morningSunlight": "La luz de la mañana está muy ligada a cómo el cuerpo programa el sueño y la vigilia. Una caminata corta al aire libre es la versión más simple.",
    "moveBody": "El cardio regular se asocia con mejor ánimo, enfoque y resistencia al estrés en una amplia cantidad de investigaciones. Empieza con 20–30 minutos a tu ritmo.",
    "fixSleep": "El sueño afecta casi todo lo demás de esta lista. Esta plantilla repasa lo básico de un horario consistente.",
    "reduceAlcohol": "El alcohol, incluso en cantidades moderadas, se asocia con un sueño más ligero y fragmentado. Reducirlo una semana te muestra el efecto directamente.",
    "journal": "Escribir convierte preocupaciones vagas en frases concretas. Una vez escritas, es más fácil examinarlas y actuar.",
    "gratitude": "Nombrar cosas específicas por las que estás agradecido — qué y por qué — es una práctica simple que a muchos les ayuda a estabilizar el ánimo.",
    "comparePastSelf": "Compararte con otros genera resentimiento; compararte con tu yo pasado muestra progreso real. Esta plantilla hace concreta esa comparación.",
    "tellTruth": "Las mentiras pequeñas son costosas de mantener. Actuar con honestidad, incluso en lo pequeño, elimina ese costo.",
    "takeResponsibility": "Enfocarte en lo que está bajo tu control es el punto de partida práctico para cambiar cualquier otra cosa.",
    "reachOut": "El contacto regular con amigos y familia es uno de los correlatos más fuertes del bienestar a largo plazo en la investigación social. Un mensaje corto cuenta.",
    "repairRelationship": "Los pequeños intentos de reparación tras un conflicto predicen la salud de la relación mejor que evitar el conflicto. Esta plantilla redacta uno.",
    "expressAppreciation": "Los investigadores de relaciones encuentran que las relaciones sanas se inclinan fuertemente hacia lo positivo. El aprecio deliberado es la forma más simple de sumar de ese lado.",
    "deliberatePractice": "Las habilidades crecen más rápido al borde de tu capacidad, con esfuerzo enfocado y retroalimentación — no solo con horas. Esta plantilla estructura una sesión.",
    "identifyMission": "Una dirección de carrera suele surgir de las habilidades que ya construiste, no solo de la introspección. Esta plantilla mapea lo que tienes.",
    "sayNo": "Cada sí gasta tiempo que no puedes reembolsar. Proteger tus horas de enfoque implica declinar cosas a propósito.",
    "listDebts": "No puedes gestionar lo que no has escrito. Listar cada deuda con su número real es el primer paso de cualquier plan de pago.",
    "emergencyFund": "Un pequeño colchón de efectivo convierte gastos sorpresa de nuevas deudas en inconvenientes. Incluso un inicio modesto cambia el patrón.",
    "trackSpending": "Las suposiciones sobre tus gastos suelen estar equivocadas. Una semana de números reales muestra exactamente a dónde va el dinero.",
    "cancelSubs": "Las suscripciones olvidadas son una fuga lenta común. Una auditoría de 15 minutos de cargos recurrentes suele encontrar al menos una.",
    "negotiateBill": "Muchas facturas — internet, teléfono, seguros — son negociables con una llamada. El peor resultado suele ser un 'no'.",
}


def main() -> None:
    for path, whys in (
        ("/Users/pabloillescas/Documents/GitHub/gylio/src/i18n/en.json", WHYS_EN),
        ("/Users/pabloillescas/Documents/GitHub/gylio/src/i18n/es-PE.json", WHYS_ES),
    ):
        with open(path) as fh:
            data = json.load(fh)
        tpl = data["tasks"]["tpl"]
        changed = 0
        for key, new_text in whys.items():
            entry = tpl.get(key)
            if not isinstance(entry, dict):
                print(f"MISSING template {key} in {path}", file=sys.stderr)
                sys.exit(1)
            if entry.get("why") != new_text:
                entry["why"] = new_text
                changed += 1
        with open(path, "w") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"{path}: {changed} whys rewritten")


if __name__ == "__main__":
    main()

export default function AssignInterventionPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Designar tarefa socioemocional</h1>

      <div style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
        Esta área está pré-pronta. Assim que definirmos a tabela/lista de intervenções, vamos:
        <ul>
          <li>selecionar atletas</li>
          <li>selecionar intervenções (tarefa)</li>
          <li>enviar intervenção (registrando em uma tabela própria ou em selection_json)</li>
        </ul>
      </div>

      <div style={{ border: "1px dashed #444", borderRadius: 12, padding: 16, opacity: 0.85 }}>
        Próximo: criar tabela <code>interventions</code> e <code>intervention_requests</code> (ou reaproveitar <code>assessment_requests</code> com <code>selection_json.type="intervention"</code>).
      </div>
    </div>
  );
}

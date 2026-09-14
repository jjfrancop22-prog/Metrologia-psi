export default async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  // Núcleo V0.1.0: endpoint seguro reservado para IA.
  // La integración con el proveedor/modelo se implementará en una versión posterior.
  return Response.json({
    ready: false,
    message: 'Endpoint IA preparado. Falta configurar proveedor, políticas y casos de uso aprobados.'
  }, { status: 200 });
};

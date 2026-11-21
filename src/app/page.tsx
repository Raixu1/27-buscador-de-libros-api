export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Buscador de libros · API</h1>
      <p>
        Servicio activo. Estado: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}

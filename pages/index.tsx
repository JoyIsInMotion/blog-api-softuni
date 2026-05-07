import Head from 'next/head';

export default function Home() {
  return (
    <div className="container">
      <Head>
        <title>Blog API</title>
        <meta name="description" content="Blog API documentation" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">Blog API</h1>

        <p className="description">
          Welcome to the Blog API. Here are the available endpoints:
        </p>

        <div className="grid">
          <div className="card">
            <h2>Public Endpoints</h2>
            <p>No authentication required.</p>
            <ul>
              <li>
                <code>POST /api/auth/register</code> - Register a new user.
              </li>
              <li>
                <code>POST /api/auth/login</code> - Login a user.
              </li>
              <li>
                <code>GET /api/posts</code> - Get all posts (paginated).
              </li>
              <li>
                <code>GET /api/posts/:id</code> - Get a single post by ID.
              </li>
            </ul>
          </div>

          <div className="card">
            <h2>Protected Endpoints</h2>
            <p>Requires JWT authentication.</p>
            <ul>
              <li>
                <code>GET /api/auth/me</code> - Get the current user.
              </li>
              <li>
                <code>POST /api/posts</code> - Create a new post.
              </li>
              <li>
                <code>PATCH /api/posts/:id</code> - Update a post by ID.
              </li>
              <li>
                <code>DELETE /api/posts/:id</code> - Delete a post by ID.
              </li>
            </ul>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          padding: 0 2rem;
        }
        .main {
          min-height: 100vh;
          padding: 4rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }
        .description {
          margin: 4rem 0;
          line-height: 1.5;
          font-size: 1.5rem;
        }
        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 800px;
        }
        .card {
          margin: 1rem;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
          width: 100%;
        }
        .card h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }
        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }
        code {
          background: #fafafa;
          border-radius: 5px;
          padding: 0.75rem;
          font-size: 1.1rem;
          font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
            DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }
      `}</style>
    </div>
  );
}

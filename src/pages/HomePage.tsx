import Hero from '../components/Hero';
import Oficinas from '../components/Oficinas';
import ProximosEventos from '../components/ProximosEventos';

export default function HomePage() {
  return (
    <>
      <Hero />
      <main>
        <Oficinas />
        <ProximosEventos />
      </main>
    </>
  );
}
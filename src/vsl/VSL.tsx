import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Footage} from './Footage';
import {Music} from './Music';
import {SoundDesign} from './SoundDesign';
import {C} from './theme';
import {Grain} from './ui/Backdrop';
import {Camera, CamKey} from './ui/Camera';
import {Flash, Line} from './ui/Fx';
import {Say} from './ui/Say';
import {S01_Open, TimerHud} from './scenes/S01_Open';
import {S02_Caminhos} from './scenes/S02_Caminhos';
import {S03_Compra} from './scenes/S03_Compra';
import {S04_Milhoes, S04b_UsoDiario} from './scenes/S04_Milhoes';
import {S05_Quebra} from './scenes/S05_Quebra';
import {S06_Nichos} from './scenes/S06_Nichos';
import {S07_Seguidores} from './scenes/S07_Seguidores';
import {S08_Generico} from './scenes/S08_Generico';
import {S09_Trava, S09b_Funciona} from './scenes/S09_Trava';
import {S10_Ordem} from './scenes/S10_Ordem';
import {S11_Solucao} from './scenes/S11_Solucao';
import {S12_Call} from './scenes/S12_Call';
import {S13_NaoEAula} from './scenes/S13_NaoEAula';
import {S14_Auditoria} from './scenes/S14_Auditoria';
import {S15_Mudancas} from './scenes/S15_Mudancas';
import {S16_Formulario} from './scenes/S16_Formulario';
import {S17_Fluxo} from './scenes/S17_Fluxo';
import {S18_Checklist} from './scenes/S18_Checklist';
import {S19_Publica} from './scenes/S19_Publica';
import {S20_Teoria} from './scenes/S20_Teoria';
import {S21_Ancora, S21b_AnchorChip, S22_Oferta} from './scenes/S21_Preco';
import {S23a_Banner, S23b_Humano} from './scenes/S23_Vagas';
import {S24_BotaoAbaixo, S25_Agenda} from './scenes/S25_Agenda';
import {S26_Sozinho, S27_Cursos, S28_Timeline, S29_CTA, S30_End} from './scenes/S26_Final';

// How the talking-head footage is framed over time (absolute output frames).
const CAM: CamKey[] = [
  {f: 0, m: 'close', d: 1},
  {f: 140, m: 'hidden', d: 10},
  {f: 352, m: 'right', d: 16},
  {f: 559, m: 'punch', d: 14},
  {f: 685, m: 'hidden', d: 10},
  {f: 850, m: 'full', d: 12},
  {f: 945, m: 'close', d: 90},
  {f: 1055, m: 'soft', d: 10},
  {f: 1125, m: 'hidden', d: 6},
  {f: 1302, m: 'left', d: 14},
  {f: 1485, m: 'hidden', d: 8},
  {f: 1528, m: 'bubble', d: 14},
  {f: 1661, m: 'punch', d: 12},
  {f: 1715, m: 'hidden', d: 8},
  {f: 1829, m: 'full', d: 10},
  {f: 1901, m: 'right', d: 14},
  {f: 2041, m: 'full', d: 12},
  {f: 2078, m: 'hidden', d: 6},
  {f: 2412, m: 'left', d: 8},
  {f: 2452, m: 'right', d: 8},
  {f: 2471, m: 'left', d: 8},
  {f: 2521, m: 'punch', d: 12},
  {f: 2582, m: 'bubble', d: 14},
  {f: 2780, m: 'hidden', d: 10},
  {f: 2997, m: 'right', d: 14},
  {f: 3117, m: 'bubble', d: 12},
  {f: 3276, m: 'punch', d: 12},
  {f: 3372, m: 'full', d: 12},
  {f: 3445, m: 'left', d: 14},
  {f: 3804, m: 'right', d: 14},
  {f: 3978, m: 'hidden', d: 10},
  {f: 4125, m: 'right', d: 14},
  {f: 4271, m: 'punch', d: 14},
  {f: 4380, m: 'close', d: 80},
  {f: 4463, m: 'hidden', d: 8},
  {f: 4573, m: 'left', d: 12},
  {f: 4626, m: 'punch', d: 10},
  {f: 4666, m: 'right', d: 12},
  {f: 4822, m: 'hidden', d: 8},
  {f: 4993, m: 'full', d: 12},
  {f: 5095, m: 'right', d: 14},
  {f: 5372, m: 'full', d: 20},
  {f: 5430, m: 'punch', d: 150},
  {f: 5585, m: 'hidden', d: 8},
  {f: 5683, m: 'punch', d: 10},
  {f: 5745, m: 'hidden', d: 8},
  {f: 5930, m: 'left', d: 14},
  {f: 6248, m: 'full', d: 14},
  {f: 6262, m: 'punch', d: 60},
];

export const VSL: React.FC = () => (
  <AbsoluteFill style={{background: C.bg}}>
    {/* ——— Layer 1: full-screen motion scenes (camera is hidden or a bubble on top) ——— */}
    <Sequence name="08 · Aplicar vs parado" from={140} durationInFrames={212}><S02_Caminhos /></Sequence>
    <Sequence name="10 · Milhões de visualizações" from={685} durationInFrames={165}><S04_Milhoes /></Sequence>
    <Sequence name="12 · Dentista vs consultor" from={1197} durationInFrames={105}><S06_Nichos /></Sequence>
    <Sequence name="14 · Curso genérico" from={1528} durationInFrames={133}><S08_Generico /></Sequence>
    <Sequence name="15 · Assiste → trava" from={1715} durationInFrames={114}><S09_Trava /></Sequence>
    <Sequence name="16 · Análise de perfil ao vivo" from={2080} durationInFrames={106}><S11_Solucao /></Sequence>
    <Sequence name="17 · Call ao vivo" from={2186} durationInFrames={193}><S12_Call /></Sequence>
    <Sequence name="19 · Auditoria do Instagram" from={2582} durationInFrames={198}><S14_Auditoria /></Sequence>
    <Sequence name="20 · 3 mudanças" from={2780} durationInFrames={217}><S15_Mudancas /></Sequence>
    <Sequence name="21b · Formulário → análise → call" from={3117} durationInFrames={159}><S17_Fluxo /></Sequence>
    <Sequence name="23 · Teoria → lista" from={3978} durationInFrames={147}><S20_Teoria /></Sequence>
    <Sequence name="28 · Curso anterior" from={5585} durationInFrames={98}><S27_Cursos /></Sequence>
    <Sequence name="29 · Semana 01 vs mês 03" from={5745} durationInFrames={185}><S28_Timeline /></Sequence>

    {/* ——— Layer 2: Marcão ——— */}
    <Camera keys={CAM}>
      <Footage />
    </Camera>

    {/* ——— Layer 3: overlays that sit on top of the footage ——— */}
    <Sequence name="07 · Abertura" from={0} durationInFrames={140}><S01_Open /></Sequence>
    <Sequence name="09 · Compra confirmada" from={352} durationInFrames={207}><S03_Compra /></Sequence>
    <Sequence name="10b · Uso todos os dias" from={850} durationInFrames={95}><S04b_UsoDiario /></Sequence>
    <Sequence name="11 · Grande quebra" from={1055} durationInFrames={142}><S05_Quebra /></Sequence>
    <Sequence name="13 · 300 vs 100.000" from={1302} durationInFrames={226}><S07_Seguidores /></Sequence>
    <Sequence name="15b · Ele funciona" from={1829} durationInFrames={72}><S09b_Funciona /></Sequence>
    <Sequence name="15c · Tudo em ordem" from={1901} durationInFrames={140}><S10_Ordem /></Sequence>
    <Sequence name="18 · Não é aula" from={2379} durationInFrames={142}><S13_NaoEAula /></Sequence>
    <Sequence name="21 · Formulário" from={2997} durationInFrames={120}><S16_Formulario /></Sequence>
    <Sequence name="22 · Você sai sabendo" from={3445} durationInFrames={359}><S18_Checklist /></Sequence>
    <Sequence name="23a · Publica no mesmo dia" from={3804} durationInFrames={174}><S19_Publica /></Sequence>
    <Sequence name="24a · Ancoragem R$497" from={4125} durationInFrames={146}><S21_Ancora /></Sequence>
    <Sequence name="24b · Chip R$497" from={4271} durationInFrames={192}><S21b_AnchorChip /></Sequence>
    <Sequence name="24c · R$197" from={4463} durationInFrames={110}><S22_Oferta /></Sequence>
    <Sequence name="25a · Vagas da semana" from={4573} durationInFrames={53}><S23a_Banner /></Sequence>
    <Sequence name="25b · 1 especialista / lotado / próxima semana" from={4666} durationInFrames={327}><S23b_Humano /></Sequence>
    <Sequence name="26a · Botão aqui embaixo" from={4993} durationInFrames={102}><S24_BotaoAbaixo /></Sequence>
    <Sequence name="26 · Calendário" from={5095} durationInFrames={277}><S25_Agenda /></Sequence>
    <Sequence name="27 · Fazer sozinho" from={5383} durationInFrames={200}><S26_Sozinho /></Sequence>
    <Sequence name="30 · CTA" from={5930} durationInFrames={318}><S29_CTA /></Sequence>
    <Sequence name="30b · Final" from={6248} durationInFrames={73}><S30_End /></Sequence>
    <TimerHud />

    {/* ——— Smart kinetic captions (only on key moments with Marcão on screen) ——— */}
    <Say a={577} b={672} hl={['viralizar', 'fazer']} />
    <Say a={1661} b={1714} hl={['seguinte']} />
    <Say a={2041} b={2079} hl={['criou']} />
    <Say a={2521} b={2580} hl={['personalizado']} size={84} />
    <Say a={3276} b={3371} hl={['minuto', 'gasto']} />
    <Say a={3372} b={3444} hl={['formulário']} />
    <Say a={4271} b={4372} hl={['página', 'entrar']} />
    <Say a={4377} b={4462} hl={['aplique', 'verdade']} hlColor={C.mint} />
    <Line a={4626} b={4666}>NÃO É PITCH DE VENDAS.</Line>
    <Say a={4993} b={5046} hl={['garantir']} pos="top" />
    <Say a={5683} b={5744} hl={['padrão']} />
    <Say a={6294} b={6321} pos="top" upper />

    {/* ——— Cut accents ——— */}
    <Flash at={2080} />
    <Flash at={4522} color={C.mint} peak={0.45} />
    <Flash at={1129} color={C.violetLight} peak={0.35} />
    <Flash at={2379} peak={0.3} />

    <Grain />
    <SoundDesign />
    <Music />
  </AbsoluteFill>
);

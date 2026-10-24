import { useEffect } from "react";

const contact = "https://github.com/KibouAkari/LifeOrbit";
export default function Legal({kind}:{kind:"privacy"|"terms"}){
  const privacy=kind==="privacy";
  useEffect(()=>{
    document.title=(privacy?"Privacy Policy":"Terms of Service")+" · LifeOrbit";
    return()=>{document.title="LifeOrbit"};
  },[privacy]);

  return <main className="legal-page">
    <header><a className="brand" href="#/login"><img src="/assets/icon.svg" alt=""/>LifeOrbit</a><a href="#/login">Back</a></header>
    <article>
      <h1>{privacy?"Privacy Policy":"Terms of Service"}</h1>
      <p className="muted">Last updated October 24, 2026</p>
      {privacy?<>
        <h2>About this service</h2>
        <p>LifeOrbit helps you organise tasks, calendar events, notes, subscriptions and personal challenges. This notice explains how information is used when you use the service.</p>
        <h2>Information we process</h2>
        <p>When you create an account, we process your display name, email address, authentication identifier and, if you sign in with Google, an optional profile picture. We store the tasks, events, notes, notebook chapters, subscriptions and challenges you add to your account. Passwords for email accounts are stored as password hashes, never as plain text.</p>
        <h2>Google Sign-In</h2>
        <p>We use Google Identity Services solely to verify your identity and create or access your LifeOrbit account. Google provides your account identifier, verified email, name and possibly a profile image. Signing in does not grant LifeOrbit access to Gmail, Google Drive or your Google Calendar. Calendar files are imported only when you choose to upload them.</p>
        <h2>Where data is processed</h2>
        <p>Vercel hosts the web application and Python API. MongoDB Atlas stores account and workspace information. Google processes identity information for Google Sign-In. These service providers may process data in different countries according to the operator's infrastructure configuration and the providers' applicable terms.</p>
        <h2>Why data is used</h2>
        <p>We process account information to authenticate you, protect your workspace and provide your requested features. We use personal workspace data to show your content and progress. Technical request information may be processed to operate and secure the service.</p>
        <h2>Storage and your choices</h2>
        <p>Your account information and saved content remain stored while your account is active, subject to operational retention and backup policies. You can edit your profile and export your account data through Settings. For removal requests or questions about personal data, contact the project operators using the project contact route below. Browser settings and essential authentication cookies may be used to maintain your session and preferences.</p>
        <h2>Contact</h2>
        <p>The LifeOrbit project is maintained through <a href={contact} target="_blank" rel="noreferrer">its project repository</a>. A designated data controller, legal contact address and documented retention and deletion procedure must be provided before the service is offered as a fully public production product.</p>
      </>:<>
        <h2>Using LifeOrbit</h2>
        <p>LifeOrbit is a personal organisation application for managing tasks, events, notes, subscriptions and challenges. You are responsible for the information you add and for keeping your login credentials secure.</p>
        <h2>Your account</h2>
        <p>Provide accurate registration details and use only an account that belongs to you. You must not interfere with the service, attempt unauthorised access or upload unlawful content.</p>
        <h2>Your content</h2>
        <p>You retain ownership of the information you create. You allow the service to process and store that information as needed to provide the features you request.</p>
        <h2>Service availability</h2>
        <p>LifeOrbit is under active development. Features may change and availability may vary. Important information should be backed up independently. The application is not a substitute for financial, medical or emergency services.</p>
        <h2>Updates</h2>
        <p>These terms may be updated when the functionality or legal requirements change. Material changes should be communicated through the application or project documentation.</p>
        <h2>Contact</h2>
        <p>For questions about the service, visit the <a href={contact} target="_blank" rel="noreferrer">LifeOrbit project repository</a>. The contracting operator and jurisdiction-specific legal provisions must be identified before offering the service commercially.</p>
      </>}
    </article>
    <footer><a href="#/privacy">Privacy</a><a href="#/terms">Terms</a></footer>
  </main>;
}
